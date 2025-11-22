import axios from 'axios';

// กำหนด URL หลักของ API ของคุณ (จากของเดิม)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

/**
 * ดึงข้อมูลสถิติ gratitude จาก backend
 * โดยการเรียก Endpoint ที่มีอยู่แล้ว (`/gratitude/`) แล้วนับจำนวนข้อมูล
 */
export const getGratitudeStats = async () => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    console.error("Authentication token not found.");
    return { total_entries: 0 };
  }

  try {
    // 1. เรียกใช้ Endpoint `GET /gratitude/` ที่มีอยู่แล้วใน Backend
    const response = await axios.get(`${API_URL}/gratitude/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 2. Backend คืนค่าเป็น Array, เราจึงนับจำนวนข้อมูลใน Array นั้นด้วย .length
    const totalEntries = Array.isArray(response.data) ? response.data.length : 0;

    // 3. คืนค่าในรูปแบบ Object ที่ `statsService.js` ต้องการ
    return { total_entries: totalEntries };

  } catch (error) {
    console.error("Failed to fetch gratitude stats:", error);
    return { total_entries: 0 };
  }
};