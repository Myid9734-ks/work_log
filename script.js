// 업무 관리 시스템 JavaScript

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentView = 'daily';
        this.currentDate = new Date();
        this.editingTaskId = null;
        this.currentFilter = null; // 현재 필터 상태 추가
        
        this.init();
    }

    async init() {
        console.log('TaskManager 초기화 시작...');
        this.setupEventListeners();
        this.setDefaultDates();
        console.log('API에서 업무 로드 시작...');
        await this.loadTasksFromAPI();
        console.log('업무 로드 완료, 화면 렌더링 시작...');
        this.renderTasks();
        this.updatePeriodDisplay();
        console.log('TaskManager 초기화 완료');
    }

    setupEventListeners() {
        // 폼 제출 이벤트
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // 조회 뷰 변경 이벤트
        document.getElementById('dailyView').addEventListener('click', () => this.changeView('daily'));
        document.getElementById('weeklyView').addEventListener('click', () => this.changeView('weekly'));
        document.getElementById('monthlyView').addEventListener('click', () => this.changeView('monthly'));

        // 날짜 네비게이션 이벤트
        document.getElementById('prevPeriod').addEventListener('click', () => this.navigatePeriod(-1));
        document.getElementById('nextPeriod').addEventListener('click', () => this.navigatePeriod(1));

        // 통계 카드 클릭 이벤트
        this.setupStatsEventListeners();
        
        // 수동 날짜 선택 이벤트
        this.setupManualDateSelection();
    }

    setupStatsEventListeners() {
        // 통계 카드 클릭 이벤트 리스너 설정
        document.addEventListener('click', (e) => {
            if (e.target.closest('.stat-item')) {
                const statItem = e.target.closest('.stat-item');
                const statType = this.getStatTypeFromElement(statItem);
                this.toggleFilter(statType);
            }
        });
    }

    getStatTypeFromElement(element) {
        // 통계 카드의 순서에 따라 필터 타입 결정
        const statItems = document.querySelectorAll('.stat-item');
        const index = Array.from(statItems).indexOf(element);
        
        switch(index) {
            case 0: return 'all';      // 총 업무
            case 1: return '예정';     // 예정
            case 2: return '진행중';   // 진행중
            case 3: return '종료';     // 완료
            default: return null;
        }
    }

    toggleFilter(filterType) {
        if (this.currentFilter === filterType) {
            // 같은 필터를 다시 클릭하면 필터 해제
            this.currentFilter = null;
            this.showNotification('모든 업무를 표시합니다.', 'info');
        } else {
            // 새로운 필터 적용
            this.currentFilter = filterType;
            const filterNames = {
                'all': '모든 업무',
                '예정': '예정 업무',
                '진행중': '진행중 업무',
                '종료': '완료된 업무'
            };
            this.showNotification(`${filterNames[filterType]}만 표시합니다.`, 'info');
        }
        
        // 통계 카드 스타일 업데이트
        this.updateStatsStyles();
        // 업무 목록 다시 렌더링
        this.renderTasks();
    }

    updateStatsStyles() {
        // 모든 통계 카드에서 활성 필터 스타일 제거
        document.querySelectorAll('.stat-item').forEach(item => {
            item.classList.remove('active-filter');
        });
        
        // 현재 활성 필터가 있으면 해당 카드에 스타일 적용
        if (this.currentFilter) {
            const statItems = document.querySelectorAll('.stat-item');
            let targetIndex = 0;
            
            switch(this.currentFilter) {
                case 'all': targetIndex = 0; break;
                case '예정': targetIndex = 1; break;
                case '진행중': targetIndex = 2; break;
                case '종료': targetIndex = 3; break;
            }
            
            if (statItems[targetIndex]) {
                statItems[targetIndex].classList.add('active-filter');
            }
        }
        
        // 업무 목록 제목에 필터 상태 표시
        const taskListTitle = document.querySelector('.task-list h2');
        if (this.currentFilter && this.currentFilter !== 'all') {
            taskListTitle.classList.add('filtered');
        } else {
            taskListTitle.classList.remove('filtered');
        }
    }

    setDefaultDates() {
        const today = new Date();
        const startDateInput = document.getElementById('startDate');
        
        startDateInput.value = this.formatDateForInput(today);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateForDisplay(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('ko-KR', options);
    }

    async handleFormSubmit() {
        console.log('handleFormSubmit 호출됨, editingTaskId:', this.editingTaskId);
        const formData = new FormData(document.getElementById('taskForm'));
        const taskData = {
            id: this.editingTaskId || Date.now().toString(),
            projectContent: formData.get('projectContent'),
            status: formData.get('status'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || null,
            memo: formData.get('memo'),
            createdAt: this.editingTaskId ? this.getTaskById(this.editingTaskId).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('폼 데이터:', taskData);

        try {
            if (this.editingTaskId) {
                await this.updateTask(taskData);
                // 편집 모드에서는 화면 업데이트를 updateTask에서 처리하지 않으므로 여기서 처리
                this.renderTasks();
            } else {
                await this.addTask(taskData);
                // 새 업무 추가는 addTask에서 renderTasks를 호출하므로 여기서는 불필요
            }

            this.resetForm();
        } catch (error) {
            console.error('폼 제출 실패:', error);
            // 에러가 발생해도 폼은 초기화하지 않음
        }
    }

    // 완료 처리 함수 추가
    async completeTask(taskId) {
        console.log('completeTask 호출됨:', taskId);
        const task = this.getTaskById(taskId);
        if (task) {
            console.log('업무 완료 처리 중:', task);
            const updatedTask = {
                ...task,
                status: '종료',
                endDate: this.formatDateForInput(new Date()),
                updatedAt: new Date().toISOString()
            };
            
            console.log('업데이트된 업무:', updatedTask);
            
            try {
                // API 호출
                await this.updateTask(updatedTask);
                
                // 로컬 데이터 즉시 업데이트
                const index = this.tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    this.tasks[index] = updatedTask;
                }
                
                this.editingTaskId = null; // 편집 모드 해제
                this.renderTasks(); // 화면 업데이트
                this.showNotification('업무가 완료 처리되었습니다!', 'success');
                
                console.log('완료 처리 성공');
            } catch (error) {
                console.error('완료 처리 실패:', error);
                this.showNotification('업무 완료 처리에 실패했습니다.', 'error');
            }
        } else {
            console.error('완료할 업무를 찾을 수 없습니다:', taskId);
        }
    }

    async addTask(taskData) {
        try {
            console.log('addTask 호출됨:', taskData);
            const apiData = workLogAPI.formatForAPI(taskData);
            const result = await workLogAPI.createWorkLog(apiData);
            
            // API 응답에서 ID 가져오기
            taskData.id = result.id;
            this.tasks.push(taskData);
            
            console.log('새 업무 추가됨:', taskData);
            this.renderTasks();
            this.showNotification('업무가 성공적으로 등록되었습니다!', 'success');
        } catch (error) {
            console.error('업무 등록 실패:', error);
            this.showNotification('업무 등록에 실패했습니다.', 'error');
        }
    }

    async updateTask(updatedTask) {
        try {
            console.log('updateTask 호출됨:', updatedTask);
            const apiData = workLogAPI.formatForAPI(updatedTask);
            await workLogAPI.updateWorkLog(updatedTask.id, apiData);
            
            // 로컬 데이터 업데이트
            const index = this.tasks.findIndex(task => task.id === updatedTask.id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                console.log('로컬 데이터 업데이트 완료');
            } else {
                console.warn('업데이트할 업무를 로컬에서 찾을 수 없습니다:', updatedTask.id);
            }
            
            // 화면 업데이트는 호출자가 처리
            this.showNotification('업무가 성공적으로 수정되었습니다!', 'success');
        } catch (error) {
            console.error('업무 수정 실패:', error);
            this.showNotification('업무 수정에 실패했습니다.', 'error');
            throw error; // 에러를 다시 던져서 호출자가 처리할 수 있도록
        }
    }

    async deleteTask(taskId) {
        if (confirm('정말로 이 업무를 삭제하시겠습니까?')) {
            try {
                // API 호출 먼저 시도
                await workLogAPI.deleteWorkLog(taskId);
                
                // API 성공 시 로컬에서 제거
                this.tasks = this.tasks.filter(task => task.id !== taskId);
                this.renderTasks();
                
                this.showNotification('업무가 삭제되었습니다.', 'info');
                
                // 통계도 업데이트
                this.updateStats();
                
                // 삭제 완료 후 화면 강제 새로고침 (즉시 실행)
                console.log('삭제 완료, 화면 새로고침 시작...');
                location.reload();
                
            } catch (error) {
                console.error('업무 삭제 실패:', error);
                this.showNotification('업무 삭제에 실패했습니다.', 'error');
                
                // 실패 시 원래 데이터 복원
                await this.loadTasksFromAPI();
                this.renderTasks();
            }
        }
    }

    getTaskById(taskId) {
        console.log('getTaskById 호출됨:', taskId, '타입:', typeof taskId);
        console.log('현재 tasks 배열:', this.tasks);
        console.log('tasks 배열 길이:', this.tasks.length);
        
        // ID 타입을 문자열로 통일
        const stringTaskId = String(taskId);
        console.log('문자열로 변환된 taskId:', stringTaskId);
        
        const task = this.tasks.find(task => {
            const taskIdStr = String(task.id);
            console.log('비교 중:', taskIdStr, '===', stringTaskId, '결과:', taskIdStr === stringTaskId);
            return taskIdStr === stringTaskId;
        });
        
        console.log('찾은 업무:', task);
        return task;
    }

    editTask(taskId) {
        console.log('editTask 호출됨:', taskId);
        const task = this.getTaskById(taskId);
        if (task) {
            this.editingTaskId = taskId;
            
            // 폼 필드 업데이트
            const form = document.getElementById('taskForm');
            if (!form) {
                console.error('taskForm을 찾을 수 없습니다.');
                return;
            }
            
            const projectContentInput = form.querySelector('[name="projectContent"]');
            const statusInput = form.querySelector('[name="status"]');
            const startDateInput = form.querySelector('[name="startDate"]');
            const endDateInput = form.querySelector('[name="endDate"]');
            const memoInput = form.querySelector('[name="memo"]');
            
            console.log('폼 요소들:', {
                projectContentInput: !!projectContentInput,
                statusInput: !!statusInput,
                startDateInput: !!startDateInput,
                endDateInput: !!endDateInput,
                memoInput: !!memoInput
            });
            
            if (projectContentInput) projectContentInput.value = task.projectContent;
            if (statusInput) statusInput.value = task.status;
            if (startDateInput) startDateInput.value = task.startDate;
            if (endDateInput) endDateInput.value = task.endDate || '';
            if (memoInput) memoInput.value = task.memo || '';
            
            // 버튼 텍스트 변경
            const submitButton = form.querySelector('.btn-primary');
            if (submitButton) submitButton.textContent = '업무 수정';
            
            // 폼을 보이게 하고 업무 목록을 숨김
            const taskContainer = document.getElementById('taskContainer');
            if (form) form.style.display = 'block';
            if (taskContainer) taskContainer.style.display = 'none';
            
            // 폼으로 스크롤
            form.scrollIntoView({ behavior: 'smooth' });
            
            console.log('편집 모드 활성화 완료');
        } else {
            console.error('업무를 찾을 수 없습니다:', taskId);
        }
    }

    async saveInlineEdit(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) {
            console.error('업무 요소를 찾을 수 없습니다:', taskId);
            return;
        }
        
        const projectContent = taskElement.querySelector('.edit-projectContent')?.value;
        const status = taskElement.querySelector('.edit-status')?.value;
        const startDate = taskElement.querySelector('.edit-startDate')?.value;
        const endDate = taskElement.querySelector('.edit-endDate')?.value;
        const memo = taskElement.querySelector('.edit-memo')?.value;

        if (!projectContent || !status || !startDate) {
            this.showNotification('필수 항목을 모두 입력해주세요.', 'error');
            return;
        }

        const updatedTask = {
            ...this.getTaskById(taskId),
            projectContent,
            status,
            startDate,
            endDate: status === '종료' ? (endDate || this.formatDateForInput(new Date())) : endDate,
            memo,
            updatedAt: new Date().toISOString()
        };

        await this.updateTask(updatedTask);
        this.editingTaskId = null;
        this.renderTasks();
    }

    cancelInlineEdit() {
        console.log('cancelInlineEdit 호출됨');
        this.editingTaskId = null;
        this.renderTasks();
        
        // 폼을 보이게 하고 업무 목록을 표시
        const form = document.getElementById('taskForm');
        const taskContainer = document.getElementById('taskContainer');
        if (form) form.style.display = 'block';
        if (taskContainer) taskContainer.style.display = 'block';
        
        console.log('편집 모드 취소 완료');
    }

    resetForm() {
        console.log('resetForm 호출됨');
        document.getElementById('taskForm').reset();
        this.editingTaskId = null;
        const submitButton = document.querySelector('.btn-primary');
        if (submitButton) submitButton.textContent = '업무 등록';
        this.setDefaultDates();
        
        // 폼을 보이게 하고 업무 목록을 표시
        const form = document.getElementById('taskForm');
        const taskContainer = document.getElementById('taskContainer');
        if (form) form.style.display = 'block';
        if (taskContainer) taskContainer.style.display = 'block';
        
        console.log('폼 초기화 완료');
    }

    changeView(view) {
        this.currentView = view;
        
        // 활성 버튼 스타일 변경
        document.querySelectorAll('.btn-view').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');
        
        this.renderTasks();
        this.updatePeriodDisplay();
    }

    navigatePeriod(direction) {
        switch (this.currentView) {
            case 'daily':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
            case 'weekly':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'monthly':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
        }
        
        this.renderTasks();
        this.updatePeriodDisplay();
    }

    updatePeriodDisplay() {
        let periodText = '';
        
        switch (this.currentView) {
            case 'daily':
                periodText = this.formatDateForDisplay(this.currentDate);
                break;
            case 'weekly':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = this.getWeekEnd(this.currentDate);
                periodText = `${this.formatDateForDisplay(weekStart)} ~ ${this.formatDateForDisplay(weekEnd)}`;
                break;
            case 'monthly':
                periodText = `${this.currentDate.getFullYear()}년 ${this.currentDate.getMonth() + 1}월`;
                break;
        }
        
        document.getElementById('currentPeriod').textContent = periodText;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        
        // 월요일(1)부터 일요일(0)까지로 변경
        // day: 0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일
        let diff;
        if (day === 0) { // 일요일인 경우
            diff = -6; // 6일 전으로 (월요일)
        } else {
            diff = 1 - day; // 월요일까지의 거리
        }
        
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() + diff);
        return weekStart;
    }

    getWeekEnd(date) {
        const weekStart = this.getWeekStart(date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 6일 후 = 일요일
        return weekEnd;
    }

    getFilteredTasks() {
        let filteredTasks = this.tasks.filter(task => {
            const taskStartDate = new Date(task.startDate);
            const taskEndDate = new Date(task.endDate || task.startDate);
            
            // 날짜별 필터링
            let dateFilter = false;
            switch (this.currentView) {
                case 'daily':
                    dateFilter = this.isSameDay(taskStartDate, this.currentDate) || 
                               this.isSameDay(taskEndDate, this.currentDate) ||
                               (taskStartDate <= this.currentDate && taskEndDate >= this.currentDate);
                    break;
                case 'weekly':
                    const weekStart = this.getWeekStart(this.currentDate);
                    const weekEnd = this.getWeekEnd(this.currentDate);
                    dateFilter = (taskStartDate <= weekEnd && taskEndDate >= weekStart);
                    break;
                case 'monthly':
                    dateFilter = taskStartDate.getMonth() === this.currentDate.getMonth() && 
                               taskStartDate.getFullYear() === this.currentDate.getFullYear();
                    break;
                default:
                    dateFilter = true;
            }
            
            // 상태별 필터링
            let statusFilter = true;
            if (this.currentFilter && this.currentFilter !== 'all') {
                statusFilter = task.status === this.currentFilter;
            }
            
            return dateFilter && statusFilter;
        });

        // 날짜순으로 정렬
        return filteredTasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    renderTasks() {
        const container = document.getElementById('taskContainer');
        const filteredTasks = this.getFilteredTasks();
        
        console.log('renderTasks 호출됨, 필터된 업무 수:', filteredTasks.length);
        console.log('전체 tasks 배열:', this.tasks);
        console.log('editingTaskId:', this.editingTaskId);
        
        // 통계 업데이트
        this.updateStats();
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📝 업무가 없습니다</h3>
                    <p>새로운 업무를 등록해보세요!</p>
                </div>
            `;
            return;
        }

        // 기존 내용을 완전히 지우고 새로 생성
        container.innerHTML = '';
        filteredTasks.forEach((task, index) => {
            console.log(`업무 ${index + 1} 렌더링:`, task);
            const taskElement = document.createElement('div');
            taskElement.innerHTML = this.createTaskHTML(task);
            container.appendChild(taskElement.firstElementChild);
        });
        
        console.log('업무 HTML 생성 완료, 이벤트 리스너 추가 시작...');
        
        // 이벤트 리스너 추가
        this.addTaskEventListeners();
        
        console.log('이벤트 리스너 추가 완료');
        
        // 강제 리플로우를 위한 트릭
        container.offsetHeight;
    }

    updateStats() {
        // 현재 선택된 기간에 해당하는 업무만으로 통계 계산
        const currentPeriodTasks = this.getCurrentPeriodTasks();
        
        const totalTasks = currentPeriodTasks.length;
        const plannedTasks = currentPeriodTasks.filter(task => task.status === '예정').length;
        const inProgressTasks = currentPeriodTasks.filter(task => task.status === '진행중').length;
        const completedTasks = currentPeriodTasks.filter(task => task.status === '종료').length;
        
        // DOM 요소가 존재하는지 확인 후 업데이트
        const totalElement = document.getElementById('totalTasks');
        const plannedElement = document.getElementById('plannedTasks');
        const inProgressElement = document.getElementById('inProgressTasks');
        const completedElement = document.getElementById('completedTasks');
        
        if (totalElement) totalElement.textContent = totalTasks;
        if (plannedElement) plannedElement.textContent = plannedTasks;
        if (inProgressElement) inProgressElement.textContent = inProgressTasks;
        if (completedElement) completedElement.textContent = completedTasks;
        
        // 강제 리플로우
        if (totalElement) totalElement.offsetHeight;
    }

    // 현재 선택된 기간에 해당하는 업무만 반환 (필터 적용 전)
    getCurrentPeriodTasks() {
        return this.tasks.filter(task => {
            const taskStartDate = new Date(task.startDate);
            const taskEndDate = new Date(task.endDate || task.startDate);
            
            switch (this.currentView) {
                case 'daily':
                    return this.isSameDay(taskStartDate, this.currentDate) || 
                           this.isSameDay(taskEndDate, this.currentDate) ||
                           (taskStartDate <= this.currentDate && taskEndDate >= this.currentDate);
                
                case 'weekly':
                    const weekStart = this.getWeekStart(this.currentDate);
                    const weekEnd = this.getWeekEnd(this.currentDate);
                    return (taskStartDate <= weekEnd && taskEndDate >= weekStart);
                
                case 'monthly':
                    return taskStartDate.getMonth() === this.currentDate.getMonth() && 
                           taskStartDate.getFullYear() === this.currentDate.getFullYear();
                
                default:
                    return true;
            }
        });
    }

    createTaskHTML(task) {
        console.log('createTaskHTML 호출됨, task:', task);
        console.log('task.id:', task.id, '타입:', typeof task.id);
        
        const startDate = new Date(task.startDate);
        const endDate = task.endDate ? new Date(task.endDate) : null;
        
        // 편집 모드인지 확인
        if (this.editingTaskId === task.id) {
            console.log('편집 모드로 HTML 생성');
            return this.createEditTaskHTML(task);
        }
        
        console.log('일반 모드로 HTML 생성');
        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${task.projectContent}</div>
                    <div class="task-status status-${task.status}">${task.status}</div>
                </div>
                
                <div class="task-dates">
                    <span>📅 시작: ${this.formatDateForDisplay(startDate)}</span>
                    ${endDate ? `<span>🏁 완료: ${this.formatDateForDisplay(endDate)}</span>` : ''}
                </div>
                
                ${task.memo ? `<div class="task-memo">💬 ${task.memo}</div>` : ''}
                
                <div class="task-actions">
                    ${task.status !== '종료' ? `<button class="btn-complete" data-task-id="${task.id}">✅ 완료</button>` : ''}
                    <button class="btn-edit" data-task-id="${task.id}">✏️ 수정</button>
                    <button class="btn-delete" data-task-id="${task.id}">🗑️ 삭제</button>
                </div>
            </div>
        `;
    }

    createEditTaskHTML(task) {
        return `
            <div class="task-item editing" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">
                        <input type="text" class="edit-projectContent" value="${task.projectContent}" placeholder="프로젝트 내용">
                    </div>
                    <div class="task-status">
                        <select class="edit-status">
                            <option value="예정" ${task.status === '예정' ? 'selected' : ''}>📅 예정</option>
                            <option value="진행중" ${task.status === '진행중' ? 'selected' : ''}>🔄 진행중</option>
                            <option value="종료" ${task.status === '종료' ? 'selected' : ''}>✅ 종료</option>
                        </select>
                    </div>
                </div>
                
                <div class="task-dates">
                    <span>
                        📅 시작: 
                        <input type="date" class="edit-startDate" value="${task.startDate}">
                    </span>
                    <span>
                        🏁 완료: 
                        <input type="date" class="edit-endDate" value="${task.endDate || ''}" ${task.status === '종료' ? '' : 'disabled'}>
                    </span>
                </div>
                
                <div class="task-memo">
                    💬 
                    <textarea class="edit-memo" rows="2" placeholder="메모를 입력하세요">${task.memo || ''}</textarea>
                </div>
                
                <div class="task-actions">
                    ${task.status !== '종료' ? `<button class="btn-complete" data-task-id="${task.id}">✅ 완료</button>` : ''}
                    <button class="btn-save" data-task-id="${task.id}">💾 저장</button>
                    <button class="btn-cancel">❌ 취소</button>
                </div>
            </div>
        `;
    }

    addTaskEventListeners() {
        console.log('addTaskEventListeners 시작...');
        
        // 완료 버튼 이벤트 리스너
        const completeButtons = document.querySelectorAll('.btn-complete');
        console.log('완료 버튼 개수:', completeButtons.length);
        completeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('완료 버튼 클릭됨:', e.target.dataset.taskId);
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    this.completeTask(taskId);
                }
            });
        });

        // 수정 버튼 이벤트 리스너
        const editButtons = document.querySelectorAll('.btn-edit');
        console.log('수정 버튼 개수:', editButtons.length);
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('수정 버튼 클릭됨:', e.target.dataset.taskId);
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    this.editTask(taskId);
                }
            });
        });

        // 삭제 버튼 이벤트 리스너
        const deleteButtons = document.querySelectorAll('.btn-delete');
        console.log('삭제 버튼 개수:', deleteButtons.length);
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('삭제 버튼 클릭됨:', e.target.dataset.taskId);
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    this.deleteTask(taskId);
                }
            });
        });

        // 편집 모드에서 저장/취소 버튼 이벤트 리스너
        const saveButtons = document.querySelectorAll('.btn-save');
        console.log('저장 버튼 개수:', saveButtons.length);
        saveButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('저장 버튼 클릭됨:', e.target.dataset.taskId);
                const taskId = e.target.dataset.taskId;
                if (taskId) {
                    this.saveInlineEdit(taskId);
                }
            });
        });

        const cancelButtons = document.querySelectorAll('.btn-cancel');
        console.log('취소 버튼 개수:', cancelButtons.length);
        cancelButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('취소 버튼 클릭됨');
                this.cancelInlineEdit();
            });
        });
        
        console.log('addTaskEventListeners 완료');
    }

    async loadTasksFromAPI() {
        try {
            console.log('loadTasksFromAPI 시작...');
            const workLogs = await workLogAPI.getAllWorkLogs();
            console.log('API에서 받은 원본 데이터:', workLogs);
            
            this.tasks = workLogs.map(workLog => {
                const formattedTask = workLogAPI.formatFromAPI(workLog);
                console.log('포맷된 업무:', formattedTask);
                return formattedTask;
            });
            
            console.log('최종 tasks 배열:', this.tasks);
            console.log('tasks 배열 길이:', this.tasks.length);
            
            if (this.tasks.length > 0) {
                console.log('첫 번째 업무 ID:', this.tasks[0].id, '타입:', typeof this.tasks[0].id);
            }
        } catch (error) {
            console.error('업무 로드 실패:', error);
            this.showNotification('업무 목록을 불러오는데 실패했습니다.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // 간단한 알림 표시
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    setupManualDateSelection() {
        const currentPeriod = document.getElementById('currentPeriod');
        const manualDateInput = document.getElementById('manualDateInput');
        
        if (!currentPeriod || !manualDateInput) {
            console.error('날짜 선택기 요소를 찾을 수 없습니다.');
            return;
        }
        
        console.log('날짜 선택기 설정 중...');
        
        // 현재 기간 클릭 시 날짜 선택기 표시
        currentPeriod.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('현재 기간 클릭됨');
            this.showManualDateSelector();
        });
        
        // 날짜 선택 시 처리
        manualDateInput.addEventListener('change', (e) => {
            console.log('날짜 선택됨:', e.target.value);
            const selectedDate = new Date(e.target.value);
            this.setCurrentDate(selectedDate);
            this.hideManualDateSelector();
        });
        
        // 날짜 선택기 외부 클릭 시 숨기기
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.period-selector')) {
                this.hideManualDateSelector();
            }
        });
        
        console.log('날짜 선택기 설정 완료');
    }

    showManualDateSelector() {
        console.log('날짜 선택기 표시 중...');
        const currentPeriod = document.getElementById('currentPeriod');
        const manualDateInput = document.getElementById('manualDateInput');
        
        if (!currentPeriod || !manualDateInput) {
            console.error('날짜 선택기 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 현재 뷰에 따라 다른 동작
        if (this.currentView === 'weekly') {
            this.showWeeklyDateSelector();
        } else {
            // 일간/월간 뷰는 기존 방식
            this.showSingleDateSelector();
        }
        
        console.log('날짜 선택기 표시 완료');
    }

    showSingleDateSelector() {
        const currentPeriod = document.getElementById('currentPeriod');
        const manualDateInput = document.getElementById('manualDateInput');
        
        // 현재 날짜를 입력 필드에 설정
        manualDateInput.value = this.formatDateForInput(this.currentDate);
        
        // 현재 기간 숨기고 날짜 선택기 표시
        currentPeriod.style.display = 'none';
        manualDateInput.style.display = 'inline-block';
        
        // 날짜 선택기에 포커스
        manualDateInput.focus();
        
        // 약간의 지연 후 클릭 이벤트 발생
        setTimeout(() => {
            manualDateInput.click();
        }, 100);
    }

    showWeeklyDateSelector() {
        // 주간 뷰일 때는 시작일과 종료일을 모두 선택할 수 있는 모달 표시
        this.showWeeklyDateModal();
    }

    showWeeklyDateModal() {
        // 기존 모달이 있다면 제거
        const existingModal = document.querySelector('.weekly-date-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 주간 날짜 선택 모달 생성
        const modal = document.createElement('div');
        modal.className = 'weekly-date-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>주간 기간 선택</h3>
                <div class="date-inputs">
                    <div class="date-input-group">
                        <label>시작일:</label>
                        <input type="date" id="weeklyStartDate" class="weekly-date-input">
                    </div>
                    <div class="date-input-group">
                        <label>종료일:</label>
                        <input type="date" id="weeklyEndDate" class="weekly-date-input">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-confirm">확인</button>
                    <button class="btn-cancel">취소</button>
                </div>
            </div>
        `;

        // 모달을 body에 추가
        document.body.appendChild(modal);

        // 현재 주의 시작일과 종료일 설정
        const weekDates = this.getWeekDates(this.currentDate);
        document.getElementById('weeklyStartDate').value = this.formatDateForInput(weekDates.start);
        document.getElementById('weeklyEndDate').value = this.formatDateForInput(weekDates.end);

        // 이벤트 리스너 설정
        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            const startDate = new Date(document.getElementById('weeklyStartDate').value);
            const endDate = new Date(document.getElementById('weeklyEndDate').value);
            
            if (startDate > endDate) {
                this.showNotification('시작일은 종료일보다 이전이어야 합니다.', 'error');
                return;
            }
            
            this.setCurrentDate(startDate);
            this.hideWeeklyDateModal();
        });

        modal.querySelector('.btn-cancel').addEventListener('click', () => {
            this.hideWeeklyDateModal();
        });

        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideWeeklyDateModal();
            }
        });

        // 모달 표시
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    hideWeeklyDateModal() {
        const modal = document.querySelector('.weekly-date-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    getWeekDates(date) {
        const start = new Date(date); // 원본 날짜 복사
        const day = start.getDay();
        // 월요일(1)부터 일요일(0)까지로 변경
        const diff = start.getDate() - day + (day === 0 ? 1 : 2 - day);
        
        const startOfWeek = new Date(start);
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // 6일 후 = 일요일
        
        return { start: startOfWeek, end: endOfWeek };
    }

    hideManualDateSelector() {
        const currentPeriod = document.getElementById('currentPeriod');
        const manualDateInput = document.getElementById('manualDateInput');
        
        // 날짜 선택기 숨기고 현재 기간 표시
        manualDateInput.style.display = 'none';
        currentPeriod.style.display = 'inline-block';
    }

    setCurrentDate(newDate) {
        this.currentDate = newDate;
        this.renderTasks();
        this.updatePeriodDisplay();
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 애플리케이션 초기화
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
});
