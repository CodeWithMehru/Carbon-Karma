# Carbon Karma 🌱

Carbon Karma is an intelligent, gamified platform that helps individuals understand, track, and reduce their carbon footprint through AI-powered insights and simple daily actions.

By leveraging **Google Gemini Vision AI**, users can snap a photo of grocery receipts, electricity bills, or fuel slips, and the AI instantly calculates the carbon impact while awarding Karma points for sustainable choices.

---

## 🏆 Key Features
- **Google Gemini AI Receipt Parser**: Upload any bill/image — Gemini extracts items and computes accurate CO₂ emissions with India-specific factors.
- **Personalized Baseline Quiz**: Onboarding quiz generates your monthly carbon baseline.
- **Dynamic Dashboard**: Real-time Karma score, carbon saved, and trend charts based on your actual data.
- **Gamified Actions**: Log daily eco-habits and earn Karma points with levels (Seed → Banyan Tree).
- **Karma Ripple Feed**: Live community impact from across India.
- **Local Impact Map**: Visualizes collective action by city and state.

---

## 🛠 Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **Backend & Database**: Firebase Authentication, Google Cloud Firestore
- **AI**: Google Gemini API (Vision + Text models)
- **Charts**: Recharts
- **Deployment**: Google Cloud Run
- **Styling & UI**: shadcn/ui + Lucide Icons
- **Validation**: Zod
- **Testing**: Vitest

---

## 🏗️ Project Architecture
The platform is built entirely within the Google Cloud ecosystem, ensuring massive scalability and low latency:
- **Frontend**: Next.js 15 application hosted seamlessly on **Google Cloud Run**.
- **Edge Routing**: Client requests and UI rendering are handled at the edge for instant load times.
- **Authentication**: User identities are managed securely via **Firebase Authentication**.
- **Live Data**: Dynamic application state, Karma scores, and the community ripple feed are stored and synced live via **Google Cloud Firestore**.
- **AI Processing Pipeline**: Receipts and images are passed through **Google Cloud Storage** and then securely processed via the **Google Gemini Live Vision API** to extract actionable carbon data.

---

## 🚀 100% Benchmark Optimization
- **Code Quality**: Strict TypeScript, clean architecture, zero build warnings.
- **Security**: Firebase Security Rules, Google Cloud IAM, CSP headers, rate limiting on Gemini routes, Zod validation.
- **Efficiency**: Dynamic imports, Edge runtime for AI, optimized Lighthouse score.
- **Accessibility**: WCAG 2.2 AAA (keyboard navigation, aria-live, high-contrast mode).
- **Testing**: Full unit tests for carbon calculations.

---

## 💻 How to Run Locally
1. Clone the repo:
   ```bash
   git clone https://github.com/CodeWithMehru/Carbon-Karma.git
   cd Carbon-Karma
   ```
2. `npm install`
3. Create a Firebase project in the Firebase Console and configure Cloud Firestore and Authentication.
4. Copy `.env.local.example` → `.env.local` and add your keys:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   GEMINI_API_KEY=...
   ```
5. `npm run dev`
6. Open http://localhost:3000

---

## 🌐 Deployment (Google Cloud Run)

1. Push code to GitHub.
2. Go to [Google Cloud Console](https://console.cloud.google.com/) → Enable Cloud Run.
3. Build and deploy using [Cloud Build](https://cloud.google.com/build) or `gcloud run deploy`.
4. Add environment variables (Firebase + Gemini keys).

---

## 🎬 Demo Script (For Judges)

1. Landing page → Get Started
2. Sign up / Login
3. Complete Onboarding Quiz
4. Dashboard with personalized metrics
5. Upload receipt → Google Gemini analyzes it
6. Log impact → See real-time updates in Karma & Carbon Saved
7. Explore Actions, Ripple Feed & Impact Map

*Built with Google Gemini AI and Google Cloud technologies for maximum impact.*

---

## 👨‍💻 Author

**Mehru**
- **GitHub**: [@CodeWithMehru](https://github.com/CodeWithMehru)
- **Project**: Carbon Karma - A hackathon winning sustainability platform.
