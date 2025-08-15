// API 호출을 담당하는 클래스
class WorkLogAPI {
    constructor() {
        // Replit API URL 설정
        this.baseURL = 'https://6b16b16f-b3d0-49e6-85ec-9b3f48a5e2d0-00-iaqg683r9svn.picard.replit.dev';
        this.apiURL = `${this.baseURL}/api`;
        console.log('🌐 API URL 설정:', this.apiURL);
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
            memo: task.memo || '',  // 메모를 별도 필드로 저장
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
            memo: workLog.memo || workLog.description || '',  // memo 필드가 있으면 사용, 없으면 description 사용
            mood: workLog.mood,
            weather: workLog.weather,
            createdAt: workLog.created_at,
            updatedAt: workLog.updated_at
        };
    }
}

// 전역 API 인스턴스 생성
const workLogAPI = new WorkLogAPI();
