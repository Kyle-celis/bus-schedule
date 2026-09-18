# Bacolod Bus Schedule

A simple, text-only bus schedule system for the MA-AO ↔ BACOLOD route in Negros Occidental. No GPS. No maps. Just a reliable timetable.

## The Goal

## The Goal

I built this because I am lazy to wait outside too long.

I live along the MA-AO ↔ BACOLOD route. Every morning, I stand on the roadside not knowing if the bus will come in 5 minutes or 25 minutes. Sometimes I wait too long. Sometimes I go outside too early and the bus is late. I wanted a simple answer to one question: *"When should I go outside?"*

This system shows a fixed timetable. No live tracking. No status updates. Just the plan. You look at the table, find the next bus, and decide when to leave your house.

It is not perfect. Buses are late. Traffic happens. But a fixed timetable is better than guessing.

## Tech Stack

| Layer | Tech |
| :--- | :--- |
| Backend | Python (FastAPI) |
| Database | PostgreSQL |
| Frontend | React + Vite + Tailwind (inline styles) |
| Auth | JWT with Argon2 password hashing |
| Tunneling | Cloudflare Tunnel (for public access) |

## Features

- Public schedule table (no login required)
- Live Philippine clock
- Filter by bus, departure point, and AM/PM
- Sort by earliest or latest departure
- "Departing in X min" warning
- Auto-refresh every 10 seconds
- Admin dashboard with JWT login
- Admin CRUD for buses, routes, and schedules
- Argon2 password hashing

## Project Structure
