# Nutri-Planner

> Automated Tracking - Optimized for Vietnamese Cuisine.

## Project Overview
Nutri-Planner is a mobile application built with **React Native** designed to help users in Vietnam effortlessly track their nutrition and manage weight. By leveraging third-party AI APIs for image and voice recognition, the app eliminates the friction of manual data entry, providing a seamless and highly localized experience tailored to Vietnamese culinary habits.

## Key Features (MVP)
* **Smart Dietary Profiling:** Automatically calculates TDEE (Total Daily Energy Expenditure) and BMR based on user metrics using the Mifflin-St Jeor equation.
* **AI-Powered Food Recognition:** Integrates Vision to recognize Vietnamese dishes from photos or voice inputs, instantly parsing calorie and macronutrient values.
* **Interactive Calorie Dashboard:** Visualizes daily calorie intake versus targets using dynamic charts, allowing users to track their progress effortlessly.
* **Local-First Architecture:** Operates with a local database to ensure immediate onboarding without the friction of a mandatory account sign-up process.
* **Manual Override:** Provides a fallback mechanism allowing users to manually edit or input meal data to ensure absolute accuracy.

## Tech Stack
* **Framework:** React Native
* **Local Storage:** SQLite / AsyncStorage
* **External APIs:** Google Cloud Vision API / OpenAI API (for data parsing)
* **Data Visualization:** React Native Chart Kit (or equivalent)
