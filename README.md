# Youtube link
[1st sprint video](https://youtu.be/z-p-CjOjcNQ)

---

# 🌱 BloomUp: Habit Tracker for Students  

BloomUp is a **web-based platform** designed to help students build steady **study** and **self-care habits**.  
With structured habit tracking, motivational feedback, and a unique **Gratitude Jar**, BloomUp empowers students to stay consistent, positive, and resilient in their daily lives.  

---

## 📌 Background  
Many students struggle with maintaining good routines due to **busy schedules, heavy workloads, and stress**, which lowers motivation.  
BloomUp is created to solve this problem by combining:  

- ✅ **Simple, structured habit tracking** – e.g., "What task did I complete today?"  
- 🌸 **Gratitude Jar** – a space to record positive moments and revisit them during hard times.  
- 📊 **Progress reports** – weekly/monthly summaries of completed tasks, moods, and streaks.  

---

## 🎯 Objectives  
- Increase **study consistency** and **self-care adherence**.  
- Encourage **reflection** with gratitude practices.  
- Support **privacy-respecting peer challenges** to motivate students.  

---

## 👥 Stakeholders & Use Cases  

### Roles & Access Levels  
- **Guest (no login)** – Can try a guided demo, view sample dashboards, and app info.  
- **Student (authenticated)** – Main user. Creates habits, logs completions, moods, gratitude, and views progress.  
- **Admin** – Handles system management, analytics, content moderation, and user roles.  

🔑 **Permissions hierarchy**: `Admin > Student > Guest`  

### Use Case List  
**Guest**  
- View landing page & feature tour  
- Try demo dashboard (read-only)  

**Student**  
- Manage account & profile (upload picture, change username)  
- Create/edit/delete habits (study/health/personal)  
- Log habit completion; view streaks & progress  
- Log mood (1–5 scale), add Gratitude entries  
- Weekly/monthly recap & reflection  
- Configure reminders/notifications  
- Upload files (images, personal notes, related documents)  
- Receive adaptive feedback & suggestions  

**Admin**  
- Manage users/roles (suspend/restore accounts)  
- Approve/curate challenge templates (e.g., 30-day mindfulness)  
- System health dashboard & analytics  
- Content moderation (reported entries)  
- Data backup/restore

---

## ⚙️ Features  

### 👤 Guest  
- Feature tour (walkthrough of core functions)  
- Demo dashboard (preloaded example data)  

### 🧑‍🎓 Student  
- **Habit Management**: create tasks with name, type (study/health/personal), frequency & reminders  
- **Mood & Gratitude**: daily mood log (1–5 scale), Gratitude Jar entries (not daily)  
- **File Handling**: upload images, personal notes, or related docs  
- **Reports**: weekly/monthly recap with graphs of completions & mood trends  
- **Feedback**: motivational messages based on progress (50%, 75%, 100%)  

### 👨‍💻 Admin  
- User & role management  
- Approve/curate global challenges  
- Analytics: active users, streak averages, challenge participation  
- Data backup/restore & system health monitoring  

---

## 🛠️ Technology Stack  

**Frontend**  
- React + Next.js (fast, responsive, server-side rendering)  

**Backend**  
- Node.js with REST API (auth, profile, CRUD habits, admin ops)  

**Database**  
- PostgreSQL (flexible schema for evolving features)  

**Deployment & DevOps**  
- Docker (containerized environments)  
- GitHub Actions (automated testing, CI/CD pipelines)

---
## 👨‍👩‍👧 Team Members  

1. **6510545276** – Kantapon Hemmadhun  
2. **6510545331** – Chananthida Sopaphol  
3. **6510545501** – Thunyanan Tangpipatpong  
4. **6510545756** – Suparak Aryasit  
