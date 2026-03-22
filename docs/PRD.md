# **Product Requirements Document (PRD): Secure Offline-First CBT System**

## **1\. Business PRD**

### **1.1 Product Vision & Objective**

To provide schools with a highly secure, resilient, and user-friendly Computer-Based Test (CBT) platform. The system is designed to handle unreliable internet connections by utilizing a "local-first" frontend architecture while maintaining strict anti-cheat mechanisms and providing real-time monitoring capabilities for invigilators.

### **1.2 User Personas**

* **Participant (Student):** Takes the quiz. Needs a seamless, distraction-free, and intuitive interface that will not lose data if the internet drops.  
* **Operator (Invigilator/Teacher):** Manages the live quiz session. Needs real-time visibility into student progress and control over test timing and security (passcodes).  
* **External System/Admin:** Third-party school management systems or admins that generate and push quiz content and participant lists to the CBT platform.

### **1.3 Key Business Features & User Stories Mapping**

| Feature Area | Business Requirement |
| :---- | :---- |
| **Data Integration** | The system must accept Quiz data and Participant lists generated externally, standardized to this application's formatting rules. |
| **Quiz Management** | Quizzes operate on a strict schedule (Start Time and Duration). Operators have the authority to modify these parameters dynamically or manually start the test early. |
| **Operator Dashboard** | Operators have a real-time live view showing: Who has joined, how many questions each participant has answered, and what specific question they are currently viewing. |
| **Participant Experience** | Participants use a numbered navigation grid to jump between questions. Questions can be marked as "Doubtful." The navigation grid uses color-coding (e.g., Green \= Answered, Gray \= Unanswered, Yellow \= Doubtful). |
| **Content Delivery** | Questions are randomized per participant to prevent cheating. However, questions sharing the same base content (e.g., a reading comprehension passage, audio clip, or diagram) must remain grouped together. |
| **Session Security** | Quizzes are protected by a passcode. To prevent passcode sharing, the system supports dynamic passcodes that reset manually by the operator or automatically on a set interval (e.g., every 60 seconds). |

### **1.4 Success Metrics (KPIs)**

* **0% Data Loss:** No lost answers due to connectivity issues.  
* **Zero Cheating Incidents:** Measured by successful blocks of tab-switching and time-tampering.  
* **High Performance:** Rapid load times and smooth rendering on low-end school devices.

## **2\. Technical PRD**

### **2.1 High-Level Architecture**

The application will utilize a **Thin-Backend / Thick-Frontend (Local-First Reactive)** architecture, optimized for performance, offline resilience, and minimal bundle size.

* **Frontend Framework:** **SvelteKit**. Chosen for its lack of virtual DOM overhead, incredibly small bundle sizes, and built-in filesystem routing. It provides excellent performance crucial for low-end devices.  
* **Styling:** **Tailwind CSS**. Integrated with SvelteKit for rapid UI development, consistent design tokens, and minimal CSS payloads via purge actions.  
* **Database Stack (Local-First Sync):**  
  * **Frontend:** **RxDB** (Reactive Database) running on top of IndexedDB. It natively integrates with Svelte stores, updating the UI automatically whenever local data changes.  
  * **Backend:** A lightweight API/Database (e.g., CouchDB or PostgreSQL) configured for replication.  
* **Communication Paradigm:** Instead of manual API calls for every action, the frontend reads/writes exclusively to the local RxDB. A background process synchronizes the local database with the backend database whenever an internet connection is available.

### **2.2 Core Technical Workflows**

#### **A. Quiz Delivery & Offline Execution**

1. **Start:** SvelteKit's load function fetches the encrypted quiz payload and initializes the local RxDB instance.  
2. **Execution:** All interactions (answering, marking doubtful, navigating) update the Svelte Store and are instantly written to the local RxDB.  
3. **Background Sync (Submission):** RxDB handles pushing changes to the server automatically. If the internet drops, syncing pauses. Once restored, RxDB pushes the local changes. There is no manual "Submit" API call required, though a "Submit" button finalizes the state locally.  
4. **Service Worker:** SvelteKit's service worker caches the app shell, Tailwind CSS, and compiled JS, allowing the app to reload even if refreshed while offline.

#### **B. Dynamic Passcode System**

* **Implementation:** The Svelte frontend uses a Time-based One-Time Password (TOTP) algorithm utility.  
* A shared seed is provided at quiz generation. The passcode verification runs entirely within a Svelte reactive statement ($:). If the computed TOTP matches the student's input (rotating every e.g., 60 seconds), the Svelte store unlocks the payload.

#### **C. Operator Monitoring (Telemetry)**

* Because of the Local-First architecture, the operator dashboard simply "subscribes" to the backend database. As participants' local databases sync in the background, the operator's UI reactively updates with their current question index and answered count.

### **2.3 Security & Anti-Cheat Enhancements**

* **Browser Lockdown:**  
  * **Fullscreen API:** Enforced on the main quiz container.  
  * **Page Visibility API:** Handled via Svelte lifecycle hooks (onMount). If document.hidden becomes true (tab switch/minimize), a warning overlay triggers, and an "infraction event" is written to the local database. Context menus and common keyboard shortcuts (Ctrl+C, Alt+Tab) are disabled via JavaScript event listeners.  
* **Time Tampering Prevention (JWT Mechanism):**  
  * The server issues a time-stamped, signed token (JWT) at the start of the test.  
  * A Web Worker handles the countdown independently of the main thread and the OS clock, preventing students from manipulating their PC clock to gain time. Periodically, the client exchanges a heartbeat with the server (if online) to validate elapsed time using a new JWT.  
* **Payload Encryption:**  
  * Quiz payloads are stored locally in an encrypted format. The passcode acts as the decryption key, preventing network spoofing tools from reading the JSON beforehand.

### **2.4 Grouped Randomization Logic**

* Questions are passed in an array of "Blocks". A block can contain one or multiple questions tied to a shared\_content ID.  
* Svelte logic shuffles the order of the *Blocks*, not the individual questions across blocks. Inner questions can optionally be shuffled, but they will always render together with their shared HTML/Image content using Tailwind flexbox/grid layouts.

## **3\. Database Schema (RxDB / IndexedDB)**

These JSON schemas define the structure of the local frontend database, which identically maps to the backend sync database.

### **3.1 QuizMetadata Collection**

Stores the configuration and scheduling details of the test.

{  
  "title": "quiz\_metadata schema",  
  "version": 0,  
  "primaryKey": "quiz\_id",  
  "type": "object",  
  "properties": {  
    "quiz\_id": { "type": "string" },  
    "title": { "type": "string" },  
    "start\_time": { "type": "number", "description": "Epoch timestamp" },  
    "duration\_minutes": { "type": "number" },  
    "passcode\_seed": { "type": "string" },  
    "passcode\_interval": { "type": "number" },  
    "operator\_started\_manually": { "type": "boolean" }  
  },  
  "required": \["quiz\_id", "start\_time", "duration\_minutes"\]  
}

### **3.2 QuestionBlock Collection**

Handles the grouped question logic to maintain shared reading/audio material.

{  
  "title": "question\_block schema",  
  "version": 0,  
  "primaryKey": "block\_id",  
  "type": "object",  
  "properties": {  
    "block\_id": { "type": "string" },  
    "quiz\_id": { "type": "string" },  
    "shared\_content": { "type": "string", "description": "HTML, image URL, or text" },  
    "questions": {  
      "type": "array",  
      "items": {  
        "type": "object",  
        "properties": {  
          "question\_id": { "type": "string" },  
          "question\_text": { "type": "string" },  
          "options": {  
            "type": "array",  
            "items": {   
              "type": "object",  
              "properties": {  
                "option\_id": { "type": "string" },  
                "text": { "type": "string" }  
              }  
            }  
          }  
        }  
      }  
    },  
    "randomize\_inner\_questions": { "type": "boolean" }   
  },  
  "required": \["block\_id", "quiz\_id", "questions"\]  
}

### **3.3 AnswerRecord Collection**

The core of the offline capability. Upserted on every user interaction.

{  
  "title": "answer\_record schema",  
  "version": 0,  
  "primaryKey": "id",  
  "type": "object",  
  "properties": {  
    "id": { "type": "string", "description": "participant\_id \+ '\_' \+ question\_id" },   
    "participant\_id": { "type": "string" },  
    "question\_id": { "type": "string" },  
    "selected\_option\_id": { "type": "string" },  
    "is\_doubtful": { "type": "boolean", "default": false },  
    "updated\_at": { "type": "number", "description": "For RxDB conflict resolution" }  
  },  
  "required": \["id", "participant\_id", "question\_id", "updated\_at"\]  
}

### **3.4 ParticipantState Collection**

Tracks the live status for Operator telemetry.

{  
  "title": "participant\_state schema",  
  "version": 0,  
  "primaryKey": "participant\_id",  
  "type": "object",  
  "properties": {  
    "participant\_id": { "type": "string" },  
    "quiz\_id": { "type": "string" },  
    "status": {   
      "type": "string",   
      "enum": \["waiting", "active", "paused\_by\_operator", "submitted"\]   
    },  
    "current\_question\_index": { "type": "number" },  
    "answered\_count": { "type": "number" },  
    "time\_remaining\_seconds": { "type": "number" },  
    "jwt\_validation\_token": { "type": "string" }  
  },  
  "required": \["participant\_id", "quiz\_id", "status"\]  
}

### **3.5 SecurityLog Collection**

Logs browser infractions for the operator's audit trail.

{  
  "title": "security\_log schema",  
  "version": 0,  
  "primaryKey": "log\_id",  
  "type": "object",  
  "properties": {  
    "log\_id": { "type": "string", "maxLength": 100 },  
    "participant\_id": { "type": "string" },  
    "quiz\_id": { "type": "string" },  
    "event\_type": {   
      "type": "string",   
      "enum": \["tab\_switched", "fullscreen\_exited", "time\_tampering\_detected"\]   
    },  
    "timestamp": { "type": "number" },  
    "details": { "type": "string" }  
  },  
  "required": \["log\_id", "participant\_id", "quiz\_id", "event\_type", "timestamp"\]  
}  
