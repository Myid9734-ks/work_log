const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 강화
app.use(cors({
    origin: true, // 모든 도메인 허용
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// CORS preflight 요청 처리
app.options('*', cors());

// 추가 CORS 헤더 설정
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 미들웨어
app.use(express.json());

// SQLite 데이터베이스 설정
const dbPath = path.join(__dirname, 'work_logs.db');
let db;

// 데이터베이스와 테이블 자동 생성
async function setupDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ SQLite 데이터베이스 연결 실패:', err);
                reject(err);
                return;
            }
            console.log('✅ SQLite 데이터베이스 연결 성공');
            
            // 테이블 생성
            db.run(`
                CREATE TABLE IF NOT EXISTS work_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    work_type TEXT NOT NULL,
                    description TEXT,
                    mood TEXT,
                    weather TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ 테이블 생성 실패:', err);
                    reject(err);
                    return;
                }
                console.log('✅ 테이블 생성 완료');
                
                // 샘플 데이터 확인 및 삽입
                db.get('SELECT COUNT(*) as count FROM work_logs', (err, row) => {
                    if (err) {
                        console.error('❌ 데이터 카운트 조회 실패:', err);
                        reject(err);
                        return;
                    }
                    
                    if (row.count === 0) {
                        // 샘플 데이터 삽입
                        const sampleData = [
                            ['2024-01-15', '09:00:00', '12:00:00', '개발', '프론트엔드 작업 로그 시스템 개발', '좋음', '맑음'],
                            ['2024-01-15', '13:00:00', '17:00:00', '회의', '프로젝트 기획 회의', '보통', '흐림'],
                            ['2024-01-16', '09:30:00', '11:30:00', '디자인', 'UI/UX 디자인 검토', '좋음', '맑음']
                        ];
                        
                        const stmt = db.prepare('INSERT INTO work_logs (date, start_time, end_time, work_type, description, mood, weather) VALUES (?, ?, ?, ?, ?, ?, ?)');
                        
                        sampleData.forEach(data => {
                            stmt.run(data, (err) => {
                                if (err) console.error('샘플 데이터 삽입 실패:', err);
                            });
                        });
                        
                        stmt.finalize(() => {
                            console.log('✅ 샘플 데이터 삽입 완료');
                            resolve(true);
                        });
                    } else {
                        console.log('✅ 기존 데이터 확인됨');
                        resolve(true);
                    }
                });
            });
        });
    });
}

// API 엔드포인트

// 1. 모든 작업 로그 조회
app.get('/api', async (req, res) => {
    try {
        db.all('SELECT * FROM work_logs ORDER BY created_at DESC', (err, rows) => {
            if (err) {
                console.error('작업 로그 조회 오류:', err);
                res.status(500).json({ error: '작업 로그 조회 실패' });
                return;
            }
            res.json(rows);
        });
    } catch (error) {
        console.error('작업 로그 조회 오류:', error);
        res.status(500).json({ error: '작업 로그 조회 실패' });
    }
});

// 2. 새로운 작업 로그 추가
app.post('/api', async (req, res) => {
    try {
        const { date, startTime, endTime, workType, description, mood, weather } = req.body;
        
        db.run(
            'INSERT INTO work_logs (date, start_time, end_time, work_type, description, mood, weather) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [date, startTime, endTime, workType, description, mood, weather],
            function(err) {
                if (err) {
                    console.error('작업 로그 저장 오류:', err);
                    res.status(500).json({ error: '작업 로그 저장 실패' });
                    return;
                }
                
                res.status(201).json({ 
                    id: this.lastID, 
                    message: '작업 로그가 성공적으로 저장되었습니다.' 
                });
            }
        );
    } catch (error) {
        console.error('작업 로그 저장 오류:', error);
        res.status(500).json({ error: '작업 로그 저장 실패' });
    }
});

// 3. 작업 로그 수정
app.put('/api', async (req, res) => {
    try {
        const { id } = req.query;
        const { date, startTime, endTime, workType, description, mood, weather } = req.body;
        
        db.run(
            'UPDATE work_logs SET date = ?, start_time = ?, end_time = ?, work_type = ?, description = ?, mood = ?, weather = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [date, startTime, endTime, workType, description, mood, weather, id],
            function(err) {
                if (err) {
                    console.error('작업 로그 수정 오류:', err);
                    res.status(500).json({ error: '작업 로그 수정 실패' });
                    return;
                }
                
                if (this.changes === 0) {
                    res.status(404).json({ error: '해당 작업 로그를 찾을 수 없습니다.' });
                    return;
                }
                
                res.json({ message: '작업 로그가 성공적으로 수정되었습니다.' });
            }
        );
    } catch (error) {
        console.error('작업 로그 수정 오류:', error);
        res.status(500).json({ error: '작업 로그 수정 실패' });
    }
});

// 4. 작업 로그 삭제
app.delete('/api', async (req, res) => {
    try {
        const { id } = req.query;
        
        db.run('DELETE FROM work_logs WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('작업 로그 삭제 오류:', err);
                res.status(500).json({ error: '작업 로그 삭제 실패' });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: '해당 작업 로그를 찾을 수 없습니다.' });
                return;
            }
            
            res.json({ message: '작업 로그가 성공적으로 삭제되었습니다.' });
        });
    } catch (error) {
        console.error('작업 로그 삭제 오류:', error);
        res.status(500).json({ error: '작업 로그 삭제 실패' });
    }
});

// 서버 시작
app.listen(PORT, async () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`📊 API 엔드포인트: http://localhost:${PORT}/api`);
    
    // 데이터베이스 설정
    try {
        await setupDatabase();
        console.log('✅ 서버 초기화 완료');
    } catch (error) {
        console.error('❌ 서버 초기화 실패:', error);
    }
});
