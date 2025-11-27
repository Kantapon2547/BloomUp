#  BloomUp: Habit Tracker for Students  

BloomUp is a web-based platform designed to help students build steady **study** and **self-care habits**.
With structured habit tracking, motivational feedback, and a unique **Gratitude Jar**, BloomUp empowers students to stay consistent, positive, and resilient in their daily lives.  


This app was created as part of the Individual Software Process course at [Kasetsart University](https://www.ku.ac.th/th). \
All project document are in the [Project wiki.](https://github.com/Kantapon2547/BloomUp/wiki "BloomUp Wiki")

##  Background  
Many students struggle with maintaining good routines due to **busy schedules, heavy workloads, and stress**, which lowers motivation.  
BloomUp is created to solve this problem by combining:  

- **Simple, structured habit tracking** – e.g., "What task did I complete today?"  
- **Gratitude Jar** – a space to record positive moments and revisit them during hard times.  
- **Progress reports** – weekly/monthly summaries of completed tasks, moods, and streaks.  


## Objectives  
- Increase **study consistency** and **self-care adherence**.  
- Encourage **reflection** with gratitude practices.  
- Support **privacy-respecting peer challenges** to motivate students.  

---

## Development Setup

Follow these steps to get the project running locally:

### 1. Clone the Repository
```bash
git clone https://github.com/Kantapon2547/BloomUp.git
cd BloomUp
```
### 2. Run with Docker Compose
Build and start all services (API, Client, PostgreSQL, and pgAdmin):

```bash
docker-compose up --build
```
To stop the containers, press CTRL + C or run:

```bash
docker-compose down
```

To remove containers, networks, and volumes:

```bash
docker-compose down -v
```

### 3. Access the Services

 Frontend (React Client): http://localhost:3000

---

## Features  

### Guest  
- Feature tour (walkthrough of core functions)  
- Demo dashboard (preloaded example data)  

### Student  
- **Habit Management**: create tasks with name, type (study/health/personal), frequency & reminders  
- **Mood & Gratitude**: daily mood log (1–5 scale)
    - Gratitude Jar: notes the good thing that happened to user (not daily ) 

- **File Handling**: upload images, personal notes, or related docs  
- **Reports**: weekly/monthly recap with graphs of completions & mood trends  
- **Feedback**: motivational messages based on progress (50%, 75%, 100%)  

---

## Technology Stack  

**Frontend**  
- React + Next.js (fast, responsive, server-side rendering)  

**Backend**  
- FAST API (auth, profile, CRUD habits, admin ops)  

**Database**  
- PostgreSQL (flexible schema for evolving features)  

**Deployment & DevOps**  
- Docker (containerized environments)  
- GitHub Actions (automated testing, CI/CD pipelines)
---


## Team Members  

1. **6510545276** – Kantapon Hemmadhun  
2. **6510545331** – Chananthida Sopaphol  
3. **6510545501** – Thunyanan Tangpipatpong  
4. **6510545756** – Suparak Aryasit  
