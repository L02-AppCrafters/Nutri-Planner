const Meal = require('../models/Meal');

/**
 * Parse the raw JSON string returned by the food-recognition API and extract
 * the fields needed for a Meal record: meal name (Tên món), estimated calories
 * (Calo), and timestamp (Thời gian).
 *
 * Supported response shapes:
 *
 * 1. Direct object:
 *    { "meal_name": "Phở bò", "calories_estimate": 450, "timestamp": "..." }
 *
 * 2. OpenAI / ChatGPT-style response where the actual data is nested inside
 *    choices[0].message.content as a JSON string:
 *    {
 *      "choices": [{
 *        "message": {
 *          "content": "{\"meal_name\": \"Phở bò\", \"calories_estimate\": 450}"
 *        }
 *      }]
 *    }
 *
 * All field look-ups are null-safe: missing or undefined fields result in null
 * rather than a crash.
 *
 * @param {string|Object|null|undefined} rawResponse - The JSON string or
 *   already-parsed object received from the API.
 * @returns {Meal|null} A Meal instance, or null when the input cannot be
 *   parsed at all.
 */
function parseApiResponse(rawResponse) {
  if (rawResponse == null || rawResponse === '') {
    return null;
  }

  // Step 1: ensure we have a plain object to work with
  let data;
  if (typeof rawResponse === 'string') {
    try {
      data = JSON.parse(rawResponse);
    } catch {
      return null;
    }
  } else {
    data = rawResponse;
  }

  // Step 2: unwrap OpenAI-style nested content
  if (data.choices != null && Array.isArray(data.choices) && data.choices.length > 0) {
    const content = data.choices[0]?.message?.content;
    if (content != null) {
      if (typeof content === 'string') {
        try {
          data = JSON.parse(content);
        } catch {
          // Content is plain text (e.g. just the dish name); treat as meal_name
          data = { meal_name: content };
        }
      } else {
        data = content;
      }
    }
  }

  // Step 3: extract fields with null-safe fallbacks
  // Support multiple common key names for resilience
  const mealName =
    data.meal_name ??
    data.name ??
    data.dish_name ??
    data.ten_mon ??
    null;

  const calories =
    data.calories_estimate ??
    data.calories ??
    data.calo ??
    null;

  const timestamp =
    data.timestamp ??
    data.time ??
    data.thoi_gian ??
    null;

  return new Meal({ mealName, calories, timestamp });
}

module.exports = { parseApiResponse };
