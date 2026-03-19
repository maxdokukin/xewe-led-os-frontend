(function () {
    const app = window.CalendarApp;
    const { calendar, config, state, els, utils } = app;

    function buildControlBar() {
        const controlBar = document.createElement('div');
        controlBar.className = 'control-bar';

        const scaleLabel = document.createElement('label');
        scaleLabel.textContent = 'Vertical Scale';
        scaleLabel.className = 'scale-label';

        const scaleSlider = document.createElement('input');
        scaleSlider.type = 'range';
        scaleSlider.min = '29';
        scaleSlider.max = '50';
        scaleSlider.value = '29';
        scaleSlider.className = 'scale-slider';

        const scaleValueDisplay = document.createElement('span');
        scaleValueDisplay.textContent = scaleSlider.value;
        scaleValueDisplay.className = 'scale-value';

        controlBar.appendChild(scaleLabel);
        controlBar.appendChild(scaleSlider);
        controlBar.appendChild(scaleValueDisplay);

        calendar.after(controlBar);

        scaleSlider.addEventListener('input', (e) => {
            updateScale(e.target.value);
        });

        els.controlBar = controlBar;
        els.scaleLabel = scaleLabel;
        els.scaleSlider = scaleSlider;
        els.scaleValueDisplay = scaleValueDisplay;
    }

    function buildDynamicStyle() {
        const dynamicStyle = document.createElement('style');
        document.head.appendChild(dynamicStyle);
        els.dynamicStyle = dynamicStyle;
    }

    function buildNowLine() {
        const nowLine = document.createElement('div');
        nowLine.className = 'now-line';
        calendar.appendChild(nowLine);
        els.nowLine = nowLine;
    }

    function buildModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';

        const modalBox = document.createElement('div');
        modalBox.className = 'modal-box';

        const modalTitle = document.createElement('h3');
        modalTitle.className = 'modal-title';

        const modalTextarea = document.createElement('textarea');
        modalTextarea.rows = 6;
        modalTextarea.className = 'modal-textarea';

        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-container';

        const colorLabel = document.createElement('span');
        colorLabel.textContent = 'Block Color:';
        colorLabel.className = 'color-label';

        const modalColorInput = document.createElement('input');
        modalColorInput.type = 'color';
        modalColorInput.className = 'modal-color-input';

        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(modalColorInput);

        const modalBtnContainer = document.createElement('div');
        modalBtnContainer.className = 'modal-btn-container';

        const cancelModalBtn = document.createElement('button');
        cancelModalBtn.textContent = 'Cancel';
        cancelModalBtn.className = 'btn-cancel';

        const saveModalBtn = document.createElement('button');
        saveModalBtn.textContent = 'Save';
        saveModalBtn.className = 'btn-save';

        modalBtnContainer.appendChild(cancelModalBtn);
        modalBtnContainer.appendChild(saveModalBtn);

        modalBox.appendChild(modalTitle);
        modalBox.appendChild(modalTextarea);
        modalBox.appendChild(colorContainer);
        modalBox.appendChild(modalBtnContainer);
        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        modalTextarea.addEventListener('input', () => {
            const autoDetectedColor = utils.detectColorFromCommands(modalTextarea.value);
            if (autoDetectedColor) {
                modalColorInput.value = autoDetectedColor;
            }
        });

        cancelModalBtn.onclick = () => {
            if (state.modalCallback) state.modalCallback(null, null);
            closeModal();
        };

        saveModalBtn.onclick = () => {
            if (state.modalCallback) state.modalCallback(modalTextarea.value, modalColorInput.value);
            closeModal();
        };

        els.modalOverlay = modalOverlay;
        els.modalBox = modalBox;
        els.modalTitle = modalTitle;
        els.modalTextarea = modalTextarea;
        els.modalColorInput = modalColorInput;
        els.cancelModalBtn = cancelModalBtn;
        els.saveModalBtn = saveModalBtn;
    }

    function buildMenu() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        const editCmdBtn = document.createElement('button');
        editCmdBtn.textContent = 'Edit Commands / Color';
        editCmdBtn.className = 'menu-btn';

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Block';
        copyBtn.className = 'menu-btn';

        const pasteBtn = document.createElement('button');
        pasteBtn.textContent = 'Paste Block';
        pasteBtn.className = 'menu-btn';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Block';
        deleteBtn.className = 'menu-btn menu-btn-delete';

        menu.appendChild(editCmdBtn);
        menu.appendChild(copyBtn);
        menu.appendChild(pasteBtn);
        menu.appendChild(deleteBtn);
        document.body.appendChild(menu);

        els.menu = menu;
        els.editCmdBtn = editCmdBtn;
        els.copyBtn = copyBtn;
        els.pasteBtn = pasteBtn;
        els.deleteBtn = deleteBtn;
    }

    function openModal(title, defaultText, defaultColor, callback) {
        els.modalTitle.textContent = title;
        els.modalTextarea.value = defaultText;

        const preDetectedColor = utils.detectColorFromCommands(defaultText);
        els.modalColorInput.value = preDetectedColor ? preDetectedColor : defaultColor;

        state.modalCallback = callback;
        els.modalOverlay.style.display = 'flex';
        els.modalTextarea.focus();
    }

    function closeModal() {
        els.modalOverlay.style.display = 'none';
        state.modalCallback = null;
    }

    function updateNowIndicator() {
        const dayHeaders = calendar.querySelectorAll('.day-header');
        const header = dayHeaders[utils.getTodayIndex()];

        if (!header) {
            els.nowLine.style.display = 'none';
            return;
        }

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        if (hours < config.startHour || hours >= config.endHour) {
            els.nowLine.style.display = 'none';
            return;
        }

        const pixelsPerHour = parseFloat(els.scaleSlider.value);
        const headerHeight = 60;
        const top = headerHeight + ((hours - config.startHour) + (minutes / 60)) * pixelsPerHour;

        els.nowLine.style.display = 'block';
        els.nowLine.style.left = `${header.offsetLeft}px`;
        els.nowLine.style.top = `${top}px`;
        els.nowLine.style.width = `${header.offsetWidth}px`;
    }

    function startNowIndicator() {
        updateNowIndicator();

        if (state.nowLineTimer) {
            clearInterval(state.nowLineTimer);
        }

        state.nowLineTimer = setInterval(() => {
            updateNowIndicator();
        }, 30000);
    }

    function updateScale(pixelsPerHour) {
        els.scaleValueDisplay.textContent = pixelsPerHour;

        const quarterHourPx = pixelsPerHour / 4;
        const numRows = utils.getTotalRows();
        calendar.style.gridTemplateRows = `auto repeat(${numRows}, ${quarterHourPx}px) 0px`;

        els.dynamicStyle.textContent = `
            .slot, .time-label {
                height: ${quarterHourPx}px !important;
                min-height: ${quarterHourPx}px !important;
                max-height: ${quarterHourPx}px !important;
            }
        `;

        updateNowIndicator();
    }

    function initCalendarGrid() {
        const corner = document.createElement('div');
        corner.className = 'header-corner';
        calendar.appendChild(corner);

        const todayIdx = utils.getTodayIndex();

        for (let i = 0; i < 7; i++) {
            const header = document.createElement('div');
            header.className = `day-header ${i === todayIdx ? 'today' : ''}`;
            header.innerHTML = `<div class="day-name">${config.days[i]}</div>`;
            calendar.appendChild(header);
        }

        for (let h = config.startHour; h < config.endHour; h++) {
            for (let qtr = 0; qtr < 4; qtr++) {
                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';

                if (qtr === 0) {
                    timeLabel.classList.add('hour-marker');
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const displayHour = h % 12 === 0 ? 12 : h % 12;
                    timeLabel.innerHTML = `<span>${displayHour} ${ampm}</span>`;
                }

                calendar.appendChild(timeLabel);

                for (let d = 0; d < 7; d++) {
                    const slot = document.createElement('div');
                    slot.className = 'slot';
                    slot.dataset.day = d;

                    if (qtr === 0) {
                        slot.classList.add('hour-marker');
                    }

                    const mins = qtr === 0 ? '00' : qtr === 1 ? '15' : qtr === 2 ? '30' : '45';
                    slot.dataset.time = `${h}:${mins}`;
                    slot.dataset.row = (h - config.startHour) * 4 + qtr;

                    calendar.appendChild(slot);
                }
            }
        }

        const endLabel = document.createElement('div');
        endLabel.className = 'time-label hour-marker end-marker';
        endLabel.innerHTML = `<span>12 AM</span>`;
        calendar.appendChild(endLabel);

        for (let d = 0; d < 7; d++) {
            const endSlot = document.createElement('div');
            endSlot.className = 'slot hour-marker end-marker';
            calendar.appendChild(endSlot);
        }
    }

    function renderEventUI(eventId) {
        const event = state.eventDatabase[eventId];
        if (!event) return;

        const slots = calendar.querySelectorAll(`.slot[data-event-id="${eventId}"]`);
        slots.forEach((slot) => {
            slot.innerHTML = '';
            slot.style.backgroundColor = event.color || '#007aff';
            slot.classList.add('selected');
        });

        const slotsByDay = {};

        event.slots.forEach((slotData) => {
            const domSlot = calendar.querySelector(`.slot[data-day="${slotData.day}"][data-time="${slotData.time}"]`);
            if (domSlot) {
                if (!slotsByDay[slotData.day]) slotsByDay[slotData.day] = [];
                slotsByDay[slotData.day].push(domSlot);
            }
        });

        const allCmdsHTML = event.commands.map((cmd) => {
            return `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">> ${cmd}</div>`;
        }).join('');

        for (const day in slotsByDay) {
            const daySlots = slotsByDay[day];

            daySlots.sort((a, b) => {
                const timeA = a.dataset.time.split(':').map(Number);
                const timeB = b.dataset.time.split(':').map(Number);
                return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
            });

            if (daySlots[0]) {
                const numSlots = daySlots.length;
                daySlots[0].style.position = 'relative';
                daySlots[0].innerHTML = `
                    <div class="slot-text" style="height: ${numSlots * 100}%;">
                        ${allCmdsHTML}
                    </div>
                `;
            }
        }
    }

    function init() {
        if (app.ui._initialized) return;
        app.ui._initialized = true;

        buildControlBar();
        buildDynamicStyle();
        buildNowLine();
        buildModal();
        buildMenu();
        initCalendarGrid();
        updateScale(els.scaleSlider.value);
        startNowIndicator();
    }

    app.ui.init = init;
    app.ui.openModal = openModal;
    app.ui.closeModal = closeModal;
    app.ui.updateNowIndicator = updateNowIndicator;
    app.ui.startNowIndicator = startNowIndicator;
    app.ui.updateScale = updateScale;
    app.ui.renderEventUI = renderEventUI;
})();