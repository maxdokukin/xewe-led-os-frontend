const calendar = document.getElementById('calendar');
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const startHour = 0;
const endHour = 24;
const totalRows = (endHour - startHour) * 4;

// --- DATA LAYER ---
let eventDatabase = {};
let copiedBlockData = null;

// --- DYNAMIC SCALE UI ---
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

const dynamicStyle = document.createElement('style');
document.head.appendChild(dynamicStyle);

// --- CURRENT TIME INDICATOR ---
const nowLine = document.createElement('div');
nowLine.className = 'now-line';
calendar.appendChild(nowLine);

let nowLineTimer = null;

function getTodayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
}

function updateNowIndicator() {
    const now = new Date();
    const todayIdx = getTodayIndex();

    const dayHeaders = calendar.querySelectorAll('.day-header');
    const header = dayHeaders[todayIdx];

    if (!header) {
        nowLine.style.display = 'none';
        return;
    }

    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < startHour || hours >= endHour) {
        nowLine.style.display = 'none';
        return;
    }

    const pixelsPerHour = parseFloat(scaleSlider.value);
    const headerHeight = 60;
    const top = headerHeight + ((hours - startHour) + (minutes / 60)) * pixelsPerHour;

    nowLine.style.display = 'block';
    nowLine.style.left = `${header.offsetLeft}px`;
    nowLine.style.top = `${top}px`;
    nowLine.style.width = `${header.offsetWidth}px`;
}

function startNowIndicator() {
    updateNowIndicator();

    if (nowLineTimer) clearInterval(nowLineTimer);

    nowLineTimer = setInterval(() => {
        updateNowIndicator();
    }, 30000);
}

function updateScale(pixelsPerHour) {
    scaleValueDisplay.textContent = pixelsPerHour;

    const quarterHourPx = pixelsPerHour / 4;
    const numRows = (endHour - startHour) * 4;
    calendar.style.gridTemplateRows = `auto repeat(${numRows}, ${quarterHourPx}px) 0px`;

    dynamicStyle.textContent = `
        .slot, .time-label {
            height: ${quarterHourPx}px !important;
            min-height: ${quarterHourPx}px !important;
            max-height: ${quarterHourPx}px !important;
        }
    `;
    updateNowIndicator();
}

scaleSlider.addEventListener('input', (e) => updateScale(e.target.value));

// --- COLOR MATH HELPERS ---
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function rgbToHex(r, g, b) {
    r = clamp(parseInt(r), 0, 255);
    g = clamp(parseInt(g), 0, 255);
    b = clamp(parseInt(b), 0, 255);
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

function hsvToHex(h, s, v) {
    h = clamp(parseInt(h), 0, 255);
    s = clamp(parseInt(s), 0, 255);
    v = clamp(parseInt(v), 0, 255);

    let h_deg = (h / 255) * 360;
    let s_norm = s / 255;
    let v_norm = v / 255;

    let c = v_norm * s_norm;
    let x = c * (1 - Math.abs((h_deg / 60) % 2 - 1));
    let m = v_norm - c;
    let r = 0, g = 0, b = 0;

    if (h_deg >= 0 && h_deg < 60) { r = c; g = x; b = 0; }
    else if (h_deg >= 60 && h_deg < 120) { r = x; g = c; b = 0; }
    else if (h_deg >= 120 && h_deg < 180) { r = 0; g = c; b = x; }
    else if (h_deg >= 180 && h_deg < 240) { r = 0; g = x; b = c; }
    else if (h_deg >= 240 && h_deg < 300) { r = x; g = 0; b = c; }
    else if (h_deg >= 300 && h_deg <= 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return rgbToHex(r, g, b);
}

function detectColorFromCommands(text) {
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();

        const rgbMatch = line.match(/\$led\s+set_rgb\s+(\d+)\s+(\d+)\s+(\d+)/i);
        if (rgbMatch) return rgbToHex(rgbMatch[1], rgbMatch[2], rgbMatch[3]);

        const hsvMatch = line.match(/\$led\s+set_hsv\s+(\d+)\s+(\d+)\s+(\d+)/i);
        if (hsvMatch) return hsvToHex(hsvMatch[1], hsvMatch[2], hsvMatch[3]);
    }
    return null;
}

// --- GRID / SLOT HELPERS ---
function timeToRow(time) {
    const [hour, minute] = time.split(':').map(Number);
    return ((hour - startHour) * 4) + Math.floor(minute / 15);
}

function rowToTime(row) {
    const totalMinutes = (startHour * 60) + (row * 15);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour}:${String(minute).padStart(2, '0')}`;
}

function getSlotByDayRow(day, row) {
    return document.querySelector(`.slot[data-day="${day}"][data-row="${row}"]`);
}

function generateEventId() {
    return `evt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// 1. Build the Grid
function initCalendar() {
    const corner = document.createElement('div');
    corner.className = 'header-corner';
    calendar.appendChild(corner);

    const jsDay = new Date().getDay();
    const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

    for (let i = 0; i < 7; i++) {
        const header = document.createElement('div');
        header.className = `day-header ${i === todayIdx ? 'today' : ''}`;
        header.innerHTML = `
            <div class="day-name">${days[i]}</div>
        `;
        calendar.appendChild(header);
    }

    for (let h = startHour; h < endHour; h++) {
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

                const row = (h - startHour) * 4 + qtr;
                slot.dataset.row = row;

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

    updateScale(scaleSlider.value);
    startNowIndicator();
}

initCalendar();
window.addEventListener('resize', updateNowIndicator);
calendar.addEventListener('scroll', updateNowIndicator);

// --- UI HELPERS ---
function renderEventUI(eventId) {
    const event = eventDatabase[eventId];
    if (!event) return;

    const slots = document.querySelectorAll(`.slot[data-event-id="${eventId}"]`);
    slots.forEach(s => {
        s.innerHTML = '';
        s.style.backgroundColor = event.color || '#007aff';
        s.classList.add('selected');
    });

    const slotsByDay = {};
    event.slots.forEach(slotData => {
        const domSlot = document.querySelector(`.slot[data-day="${slotData.day}"][data-time="${slotData.time}"]`);
        if (domSlot) {
            if (!slotsByDay[slotData.day]) slotsByDay[slotData.day] = [];
            slotsByDay[slotData.day].push(domSlot);
        }
    });

    const allCmdsHTML = event.commands.map(cmd =>
        `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">> ${cmd}</div>`
    ).join('');

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

// --- COPY / PASTE HELPERS ---
function copyEventToClipboard(eventId) {
    const event = eventDatabase[eventId];
    if (!event || !event.slots || event.slots.length === 0) return;

    const normalizedSlots = event.slots.map(slot => ({
        day: Number(slot.day),
        row: timeToRow(slot.time)
    }));

    const minDay = Math.min(...normalizedSlots.map(s => s.day));
    const minRow = Math.min(...normalizedSlots.map(s => s.row));

    copiedBlockData = {
        commands: [...event.commands],
        color: event.color || '#007aff',
        offsets: normalizedSlots.map(slot => ({
            dayOffset: slot.day - minDay,
            rowOffset: slot.row - minRow
        }))
    };
}

function canPasteBlockAt(targetSlot, clipboardData) {
    if (!targetSlot || !clipboardData) return false;

    const baseDay = Number(targetSlot.dataset.day);
    const baseRow = Number(targetSlot.dataset.row);

    for (const offset of clipboardData.offsets) {
        const targetDay = baseDay + offset.dayOffset;
        const targetRow = baseRow + offset.rowOffset;

        if (targetDay < 0 || targetDay > 6) return false;
        if (targetRow < 0 || targetRow >= totalRows) return false;

        const domSlot = getSlotByDayRow(targetDay, targetRow);
        if (!domSlot || domSlot.dataset.eventId) return false;
    }

    return true;
}

function pasteCopiedBlockAt(targetSlot) {
    if (!targetSlot || !copiedBlockData) return false;
    if (!canPasteBlockAt(targetSlot, copiedBlockData)) return false;

    const baseDay = Number(targetSlot.dataset.day);
    const baseRow = Number(targetSlot.dataset.row);
    const uniqueEventId = generateEventId();

    const newRecord = {
        id: uniqueEventId,
        commands: [...copiedBlockData.commands],
        color: copiedBlockData.color,
        slots: []
    };

    copiedBlockData.offsets.forEach(offset => {
        const day = baseDay + offset.dayOffset;
        const row = baseRow + offset.rowOffset;
        const domSlot = getSlotByDayRow(day, row);

        if (domSlot) {
            domSlot.dataset.eventId = uniqueEventId;
            domSlot.classList.add('selected');

            newRecord.slots.push({
                day,
                time: rowToTime(row)
            });
        }
    });

    eventDatabase[uniqueEventId] = newRecord;
    renderEventUI(uniqueEventId);
    console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));
    return true;
}

// --- MODAL UI ---
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

let modalCallback = null;

modalTextarea.addEventListener('input', () => {
    const autoDetectedColor = detectColorFromCommands(modalTextarea.value);
    if (autoDetectedColor) {
        modalColorInput.value = autoDetectedColor;
    }
});

function openModal(title, defaultText, defaultColor, callback) {
    modalTitle.textContent = title;
    modalTextarea.value = defaultText;

    const preDetectedColor = detectColorFromCommands(defaultText);
    modalColorInput.value = preDetectedColor ? preDetectedColor : defaultColor;

    modalCallback = callback;
    modalOverlay.style.display = 'flex';
    modalTextarea.focus();
}

function closeModal() {
    modalOverlay.style.display = 'none';
    modalCallback = null;
}

cancelModalBtn.onclick = () => {
    if (modalCallback) modalCallback(null, null);
    closeModal();
};

saveModalBtn.onclick = () => {
    if (modalCallback) modalCallback(modalTextarea.value, modalColorInput.value);
    closeModal();
};

// 2. Build the Edit/Delete/Copy/Paste Menu UI
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

let activeEventId = null;
let menuTargetSlot = null;

function hideMenu() {
    menu.style.display = 'none';
    activeEventId = null;
    menuTargetSlot = null;
}

function showMenu(x, y, { eventId = null, targetSlot = null } = {}) {
    activeEventId = eventId;
    menuTargetSlot = targetSlot;

    const hasEvent = !!eventId;
    const isEmptySlotTarget = !!(targetSlot && !targetSlot.dataset.eventId);
    const canPaste = isEmptySlotTarget && copiedBlockData && canPasteBlockAt(targetSlot, copiedBlockData);

    editCmdBtn.style.display = hasEvent ? 'block' : 'none';
    copyBtn.style.display = hasEvent ? 'block' : 'none';
    deleteBtn.style.display = hasEvent ? 'block' : 'none';

    pasteBtn.style.display = targetSlot ? 'block' : 'none';
    pasteBtn.disabled = !canPaste;
    pasteBtn.style.opacity = canPaste ? '1' : '0.5';
    pasteBtn.style.cursor = canPaste ? 'pointer' : 'not-allowed';

    menu.style.display = 'flex';
    menu.style.left = `${Math.min(x + 10, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(y + 10, window.innerHeight - 220)}px`;
}

document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target) && !modalOverlay.contains(e.target) && (!e.target.classList || !e.target.classList.contains('selected'))) {
        hideMenu();
    }
});

// Edit Logic
editCmdBtn.addEventListener('click', () => {
    if (activeEventId && eventDatabase[activeEventId]) {
        const currentEventId = activeEventId;
        const currentCmds = eventDatabase[currentEventId].commands.join('\n');
        const currentColor = eventDatabase[currentEventId].color || '#007aff';

        openModal('Edit Block', currentCmds, currentColor, (editedCmds, newColor) => {
            if (editedCmds !== null) {
                const newCommandArray = editedCmds.split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                eventDatabase[currentEventId].commands = newCommandArray;
                eventDatabase[currentEventId].color = newColor;
                renderEventUI(currentEventId);
                console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));
            }
        });
    }
    hideMenu();
});

// Copy Logic
copyBtn.addEventListener('click', () => {
    if (activeEventId && eventDatabase[activeEventId]) {
        copyEventToClipboard(activeEventId);
    }
    hideMenu();
});

// Paste Logic
pasteBtn.addEventListener('click', () => {
    if (!menuTargetSlot || !copiedBlockData) return;
    if (canPasteBlockAt(menuTargetSlot, copiedBlockData)) {
        pasteCopiedBlockAt(menuTargetSlot);
    }
    hideMenu();
});

// Delete Logic
deleteBtn.addEventListener('click', () => {
    if (activeEventId) {
        const currentEventId = activeEventId;
        const slots = document.querySelectorAll(`.slot[data-event-id="${currentEventId}"]`);
        slots.forEach(slot => {
            slot.classList.remove('selected');
            slot.innerHTML = '';
            slot.style.backgroundColor = '';
            delete slot.dataset.eventId;
        });

        delete eventDatabase[currentEventId];
        console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));
    }
    hideMenu();
});

// 3. Drag and Drop Interaction
let isDragging = false;
let dragAnchor = null;
let currentDragSession = new Set();

function updateDragSelection(currentSlot) {
    if (!dragAnchor || !currentSlot) return;
    if (currentSlot.dataset.day !== dragAnchor.dataset.day) return;

    const day = dragAnchor.dataset.day;
    const startRow = Math.min(
        Number(dragAnchor.dataset.row),
        Number(currentSlot.dataset.row)
    );
    const endRow = Math.max(
        Number(dragAnchor.dataset.row),
        Number(currentSlot.dataset.row)
    );

    const nextSession = new Set();

    document.querySelectorAll(`.slot[data-day="${day}"][data-row]`).forEach(slot => {
        const row = Number(slot.dataset.row);
        const inRange = row >= startRow && row <= endRow;
        const isFree = !slot.dataset.eventId;

        if (inRange && isFree) {
            nextSession.add(slot);
            slot.classList.add('selected');
        } else if (currentDragSession.has(slot)) {
            slot.classList.remove('selected');
        }
    });

    currentDragSession = nextSession;
}

calendar.addEventListener('pointerdown', (e) => {
    if (modalOverlay.style.display === 'flex') return;
    if (e.button !== 0) return;

    const slot = e.target.closest('.slot[data-day][data-row]');
    if (!slot) return;

    if (slot.classList.contains('selected') && slot.dataset.eventId) {
        isDragging = false;
        showMenu(e.clientX, e.clientY, {
            eventId: slot.dataset.eventId,
            targetSlot: slot
        });
        return;
    }

    hideMenu();
    isDragging = true;
    dragAnchor = slot;
    currentDragSession = new Set();

    if (calendar.setPointerCapture) {
        calendar.setPointerCapture(e.pointerId);
    }

    updateDragSelection(slot);
});

calendar.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el ? el.closest('.slot[data-day][data-row]') : null;

    if (slot) {
        updateDragSelection(slot);
    }
});

window.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;
    dragAnchor = null;

    if (currentDragSession.size > 0) {
        const savedSession = Array.from(currentDragSession);

        openModal('Enter CLI Commands', '$led set_hsv 85 255 255', '#33ff33', (cmdText, chosenColor) => {
            if (cmdText !== null && cmdText.trim() !== "") {
                const commandArray = cmdText.split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                const uniqueEventId = generateEventId();

                const newRecord = {
                    id: uniqueEventId,
                    commands: commandArray,
                    color: chosenColor,
                    slots: []
                };

                savedSession.forEach(slot => {
                    slot.dataset.eventId = uniqueEventId;
                    newRecord.slots.push({
                        day: Number(slot.dataset.day),
                        time: slot.dataset.time
                    });
                });

                eventDatabase[uniqueEventId] = newRecord;
                console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));

                renderEventUI(uniqueEventId);
            } else {
                savedSession.forEach(slot => {
                    slot.classList.remove('selected');
                    slot.style.backgroundColor = '';
                });
            }
        });
    }

    currentDragSession.clear();
});

// Right-click menu support for both existing blocks and empty slots
calendar.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    if (modalOverlay.style.display === 'flex') return;

    const slot = e.target.closest('.slot[data-day][data-row]');
    if (!slot) {
        hideMenu();
        return;
    }

    showMenu(e.clientX, e.clientY, {
        eventId: slot.dataset.eventId || null,
        targetSlot: slot
    });
});