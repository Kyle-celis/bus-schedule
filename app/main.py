from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
from app.database import get_db_connection



app = FastAPI(title="Bacolod Bus Schedule API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Config ---
SECRET_KEY = "change_this_to_a_random_secret_key_later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=3,
    argon2__memory_cost=65536,
    argon2__parallelism=4,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception

# --- Pydantic Models ---
class BusCreate(BaseModel):
    plate_number: str
    capacity: Optional[int] = 50

class RouteCreate(BaseModel):
    origin: str
    destination: str
    base_travel_mins: int

class ScheduleCreate(BaseModel):
    bus_id: int
    route_id: int
    departure_time: str  # "16:00:00"
    days_of_week: Optional[str] = "Daily"


# --- Public Endpoints ---
@app.get("/")
def root():
    return {"message": "Bacolod Bus Schedule API is running"}


@app.get("/api/schedule")
def get_schedule():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            b.plate_number,
            r.origin,
            s.departure_time,
            r.destination,
            (s.departure_time + (r.base_travel_mins || ' minutes')::INTERVAL) AS arrival_time
        FROM schedules s
        JOIN buses b ON s.bus_id = b.id
        JOIN routes r ON s.route_id = r.id
        ORDER BY s.departure_time ASC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# --- Admin Login ---
@app.post("/api/admin/login")
def admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT username, password_hash FROM admins WHERE username = %s", (form_data.username,))
    admin = cur.fetchone()
    cur.close()
    conn.close()

    if not admin or not verify_password(form_data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(data={"sub": admin["username"]})
    return {"access_token": token, "token_type": "bearer"}


# --- Admin Protected Endpoints ---
@app.get("/api/admin/me")
def admin_me(current_admin: str = Depends(get_current_admin)):
    return {"username": current_admin}


# --- Admin CRUD: Buses ---
@app.get("/api/admin/buses")
def list_buses(current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, plate_number, capacity FROM buses ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.post("/api/admin/buses")
def create_bus(bus: BusCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO buses (plate_number, capacity) VALUES (%s, %s) RETURNING id, plate_number, capacity",
            (bus.plate_number, bus.capacity)
        )
        new_bus = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return new_bus

@app.put("/api/admin/buses/{bus_id}")
def update_bus(bus_id: int, bus: BusCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE buses SET plate_number = %s, capacity = %s WHERE id = %s RETURNING id, plate_number, capacity",
            (bus.plate_number, bus.capacity, bus_id)
        )
        updated = cur.fetchone()
        conn.commit()
        if not updated:
            raise HTTPException(status_code=404, detail="Bus not found")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return updated

@app.delete("/api/admin/buses/{bus_id}")
def delete_bus(bus_id: int, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM buses WHERE id = %s RETURNING id", (bus_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Bus not found")
    return {"message": "Bus deleted"}


# --- Admin CRUD: Routes ---
@app.get("/api/admin/routes")
def list_routes(current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, origin, destination, base_travel_mins FROM routes ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.post("/api/admin/routes")
def create_route(route: RouteCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO routes (origin, destination, base_travel_mins) VALUES (%s, %s, %s) RETURNING id, origin, destination, base_travel_mins",
            (route.origin, route.destination, route.base_travel_mins)
        )
        new_route = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return new_route

@app.put("/api/admin/routes/{route_id}")
def update_route(route_id: int, route: RouteCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE routes SET origin = %s, destination = %s, base_travel_mins = %s WHERE id = %s RETURNING id, origin, destination, base_travel_mins",
            (route.origin, route.destination, route.base_travel_mins, route_id)
        )
        updated = cur.fetchone()
        conn.commit()
        if not updated:
            raise HTTPException(status_code=404, detail="Route not found")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return updated

@app.delete("/api/admin/routes/{route_id}")
def delete_route(route_id: int, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM routes WHERE id = %s RETURNING id", (route_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}


# --- Admin CRUD: Schedules ---
@app.get("/api/admin/schedules")
def list_schedules(current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            s.id,
            s.bus_id,
            s.route_id,
            b.plate_number,
            r.origin,
            r.destination,
            s.departure_time,
            s.days_of_week
        FROM schedules s
        JOIN buses b ON s.bus_id = b.id
        JOIN routes r ON s.route_id = r.id
        ORDER BY s.departure_time ASC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.post("/api/admin/schedules")
def create_schedule(schedule: ScheduleCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO schedules (bus_id, route_id, departure_time, days_of_week) VALUES (%s, %s, %s, %s) RETURNING id, bus_id, route_id, departure_time, days_of_week",
            (schedule.bus_id, schedule.route_id, schedule.departure_time, schedule.days_of_week)
        )
        new_schedule = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return new_schedule

@app.put("/api/admin/schedules/{schedule_id}")
def update_schedule(schedule_id: int, schedule: ScheduleCreate, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE schedules SET bus_id = %s, route_id = %s, departure_time = %s, days_of_week = %s WHERE id = %s RETURNING id, bus_id, route_id, departure_time, days_of_week",
            (schedule.bus_id, schedule.route_id, schedule.departure_time, schedule.days_of_week, schedule_id)
        )
        updated = cur.fetchone()
        conn.commit()
        if not updated:
            raise HTTPException(status_code=404, detail="Schedule not found")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()
    return updated

@app.delete("/api/admin/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, current_admin: str = Depends(get_current_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM schedules WHERE id = %s RETURNING id", (schedule_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}
