// API 호출을 담당하는 클래스
class WorkLogAPI {
    constructor() {
        // Netlify 환경변수에서 API URL 가져오기
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/.netlify/functions/worklogs`;
    }

    // 모든 작업 로그 조회
    async getAllWorkLogs() {
        try {
            const response = await fetch(`${this.apiURL}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('작업 로그 조회 실패:', error);
            throw error;
        }
    }

    // 새로운 작업 로그 추가
    async createWorkLog(workLogData) {
        try {
            const response = await fetch(`${this.apiURL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workLogData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('작업 로그 생성 실패:', error);
            throw error;
        }
    }

    // 작업 로그 수정
    async updateWorkLog(id, workLogData) {
        try {
            const response = await fetch(`${this.apiURL}?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workLogData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('작업 로그 수정 실패:', error);
            throw error;
        }
    }

    // 작업 로그 삭제
    async deleteWorkLog(id) {
        try {
            const response = await fetch(`${this.apiURL}?id=${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('작업 로그 삭제 실패:', error);
            throw error;
        }
    }

    // 데이터 형식 변환 (프론트엔드 → API)
    formatForAPI(task) {
        return {
            date: task.startDate,
            startTime: task.startTime || '09:00:00',
            endTime: task.endTime || '18:00:00',
            workType: task.status,
            description: task.projectContent,
            mood: task.mood || '보통',
            weather: task.weather || '맑음'
        };
    }

    // 데이터 형식 변환 (API → 프론트엔드)
    formatFromAPI(workLog) {
        return {
            id: workLog.id,
            projectContent: workLog.description,
            status: workLog.work_type,
            startDate: workLog.date,
            endDate: workLog.date,
            startTime: workLog.start_time,
            endTime: workLog.end_time,
            memo: workLog.description,
            mood: workLog.mood,
            weather: workLog.weather,
            createdAt: workLog.created_at,
            updatedAt: workLog.updated_at
        };
    }
}

// 전역 API 인스턴스 생성
const workLogAPI = new WorkLogAPI();
