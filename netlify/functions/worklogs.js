const mysql = require('mysql2/promise');

// MySQL 연결 설정
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'work_log'
};

// MySQL 연결 풀 생성
let pool;

async function getConnection() {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return pool;
}

// 데이터베이스와 테이블 자동 생성
async function setupDatabase() {
    try {
        const connection = await getConnection();
        
        // 테이블이 없으면 생성
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS work_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL COMMENT '작업 날짜',
                start_time TIME NOT NULL COMMENT '시작 시간',
                end_time TIME NOT NULL COMMENT '종료 시간',
                work_type VARCHAR(50) NOT NULL COMMENT '작업 유형',
                description TEXT COMMENT '작업 설명',
                mood VARCHAR(20) COMMENT '기분',
                weather VARCHAR(20) COMMENT '날씨',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
                
                INDEX idx_date (date),
                INDEX idx_work_type (work_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='작업 로그 테이블'
        `);
        
        // 샘플 데이터 확인 및 삽입
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM work_logs');
        if (rows[0].count === 0) {
            await connection.execute(`
                INSERT INTO work_logs (date, start_time, end_time, work_type, description, mood, weather) VALUES
                ('2024-01-15', '09:00:00', '12:00:00', '개발', '프론트엔드 작업 로그 시스템 개발', '좋음', '맑음'),
                ('2024-01-15', '13:00:00', '17:00:00', '회의', '프로젝트 기획 회의', '보통', '흐림'),
                ('2024-01-16', '09:30:00', '11:30:00', '디자인', 'UI/UX 디자인 검토', '좋음', '맑음')
            `);
        }
        
        return true;
    } catch (error) {
        console.error('데이터베이스 설정 실패:', error);
        return false;
    }
}

// 메인 핸들러 함수
exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // 데이터베이스 설정
        await setupDatabase();
        const connection = await getConnection();

        switch (event.httpMethod) {
            case 'GET':
                // 모든 작업 로그 조회
                const [rows] = await connection.execute('SELECT * FROM work_logs ORDER BY created_at DESC');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(rows)
                };

            case 'POST':
                // 새로운 작업 로그 추가
                const data = JSON.parse(event.body);
                const { date, startTime, endTime, workType, description, mood, weather } = data;
                
                const [result] = await connection.execute(
                    'INSERT INTO work_logs (date, start_time, end_time, work_type, description, mood, weather) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [date, startTime, endTime, workType, description, mood, weather]
                );
                
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({ 
                        id: result.insertId, 
                        message: '작업 로그가 성공적으로 저장되었습니다.' 
                    })
                };

            case 'PUT':
                // 작업 로그 수정 (쿼리스트링으로 id 전달)
                const id = (event.queryStringParameters && event.queryStringParameters.id) || null;
                const updateData = JSON.parse(event.body);
                const { date: updateDate, startTime: updateStartTime, endTime: updateEndTime, workType: updateWorkType, description: updateDescription, mood: updateMood, weather: updateWeather } = updateData;
                
                await connection.execute(
                    'UPDATE work_logs SET date = ?, start_time = ?, end_time = ?, work_type = ?, description = ?, mood = ?, weather = ?, updated_at = NOW() WHERE id = ?',
                    [updateDate, updateStartTime, updateEndTime, updateWorkType, updateDescription, updateMood, updateWeather, id]
                );
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: '작업 로그가 성공적으로 수정되었습니다.' })
                };

            case 'DELETE':
                // 작업 로그 삭제 (쿼리스트링으로 id 전달)
                const deleteId = (event.queryStringParameters && event.queryStringParameters.id) || null;
                
                await connection.execute('DELETE FROM work_logs WHERE id = ?', [deleteId]);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: '작업 로그가 성공적으로 삭제되었습니다.' })
                };

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: '허용되지 않는 HTTP 메서드입니다.' })
                };
        }

    } catch (error) {
        console.error('오류 발생:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
        };
    }
};
