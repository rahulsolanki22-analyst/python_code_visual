const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

export async function visualizeCode(code, maxSteps = 1000, timeout = 2.0) {
  try {
    const response = await fetch(`${API_BASE_URL}/visualize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        max_steps: maxSteps,
        timeout: timeout,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error during code visualization:", error);
    return {
      success: false,
      error: error.message || "Failed to connect to the backend server.",
    };
  }
}
