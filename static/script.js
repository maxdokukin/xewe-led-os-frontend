const calendar = document.getElementById('calendar');
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const startHour = 0;
const endHour = 24;

// --- DATA LAYER ---
let eventDatabase = {};

// --- DYNAMIC SCALE UI ---
const controlBar = document.createElement('div');
controlBar.style.padding = '10px 20px';
controlBar.style.display = 'flex';
controlBar.style.alignItems = 'center';
controlBar.style.gap = '15px';
controlBar.style.fontFamily = 'sans-serif';
controlBar.style.backgroundColor = '#f9f9f9';
controlBar.style.borderBottom = '1px solid #ddd';

const scaleLabel = document.createElement('label');
scaleLabel.textContent = 'Vertical Scale (px/hour): ';
scaleLabel.style.fontSize = '14px';
scaleLabel.style.fontWeight = '500';

const scaleSlider = document.createElement('input');
scaleSlider.type = 'range';
scaleSlider.min = '40';
scaleSlider.max = '400';
scaleSlider.value = '120';
scaleSlider.style.cursor = 'pointer';

const scaleValueDisplay = document.createElement('span');
scaleValueDisplay.textContent = scaleSlider.value;
scaleValueDisplay.style.fontSize = '14px';
scaleValueDisplay.style.fontFamily = 'monospace';
scaleValueDisplay.style.width = '30px';

controlBar.appendChild(scaleLabel);
controlBar.appendChild(scaleSlider);
controlBar.appendChild(scaleValueDisplay);

// Insert control bar before the calendar in the DOM
calendar.parentNode.insertBefore(controlBar, calendar);

// Create a dynamic style tag to control element heights and new visual tweaks
const dynamicStyle = document.createElement('style');
document.head.appendChild(dynamicStyle);

function updateScale(pixelsPerHour) {
    scaleValueDisplay.textContent = pixelsPerHour;
    const quarterHourPx = pixelsPerHour / 4;

    const numRows = (endHour - startHour) * 4;
    calendar.style.gridTemplateRows = `auto repeat(${numRows}, ${quarterHourPx}px)`;

    // Added visual tweaks: thicker hour lines and header margin
    dynamicStyle.textContent = `
        .slot, .time-label {
            height: ${quarterHourPx}px !important;
            min-height: ${quarterHourPx}px !important;
            max-height: ${quarterHourPx}px !important;
            box-sizing: border-box !important;
        }
        .hour-marker {
            border-top: 2px solid #999 !important; /* Thicker line for full hours */
        }
        .day-header, .header-corner {
            margin-bottom: 8px !important; /* Gap between header and grid */
        }
    `;
}

// Listen to the slider
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


// 1. Build the Grid
function initCalendar() {
    const corner = document.createElement('div');
    corner.className = 'header-corner';
    calendar.appendChild(corner);

    const jsDay = new Date().getDay();
    const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const todayDate = new Date().getDate();

    for (let i = 0; i < 7; i++) {
        const header = document.createElement('div');
        header.className = `day-header ${i === todayIdx ? 'today' : ''}`;

        const d = new Date();
        d.setDate(todayDate - todayIdx + i);

        header.innerHTML = `
            <div class="day-name">${days[i]}</div>
            <div class="day-number">${d.getDate()}</div>
        `;
        calendar.appendChild(header);
    }

    for (let h = startHour; h < endHour; h++) {
        for(let qtr = 0; qtr < 4; qtr++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';

            // Add the heavy top border to the top of the hour
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

                // Add the heavy top border to the top of the hour slots
                if (qtr === 0) {
                    slot.classList.add('hour-marker');
                }

                const mins = qtr === 0 ? '00' : qtr === 1 ? '15' : qtr === 2 ? '30' : '45';
                slot.dataset.time = `${h}:${mins}`;
                calendar.appendChild(slot);
            }
        }
    }

    updateScale(scaleSlider.value);
}

initCalendar();

// --- UI HELPERS ---
function renderEventUI(eventId) {
    const event = eventDatabase[eventId];
    if (!event) return;

    const slots = document.querySelectorAll(`.slot[data-event-id="${eventId}"]`);
    slots.forEach(s => {
        s.innerHTML = '';
        s.style.backgroundColor = event.color || '#007aff';
        s.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
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
                <div class="slot-text" style="
                    position: absolute; 
                    top: 0; 
                    left: 0; 
                    width: 100%; 
                    height: ${numSlots * 100}%; 
                    overflow: hidden; 
                    font-family: monospace; 
                    font-size: 11px; 
                    padding: 4px 6px; 
                    box-sizing: border-box;
                    pointer-events: none;
                    line-height: 1.5;
                    color: #ffffff;
                    text-shadow: 0px 1px 3px rgba(0,0,0,0.4);
                    z-index: 10;
                ">
                    ${allCmdsHTML}
                </div>
            `;
        }
    }
}

// --- MODAL UI ---
const modalOverlay = document.createElement('div');
modalOverlay.style.position = 'fixed';
modalOverlay.style.top = '0';
modalOverlay.style.left = '0';
modalOverlay.style.width = '100vw';
modalOverlay.style.height = '100vh';
modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
modalOverlay.style.display = 'none';
modalOverlay.style.justifyContent = 'center';
modalOverlay.style.alignItems = 'center';
modalOverlay.style.zIndex = '2000';

const modalBox = document.createElement('div');
modalBox.style.backgroundColor = '#fff';
modalBox.style.padding = '20px';
modalBox.style.borderRadius = '12px';
modalBox.style.width = '400px';
modalBox.style.maxWidth = '90%';
modalBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
modalBox.style.display = 'flex';
modalBox.style.flexDirection = 'column';
modalBox.style.gap = '15px';

const modalTitle = document.createElement('h3');
modalTitle.style.margin = '0';
modalTitle.style.fontSize = '18px';

const modalTextarea = document.createElement('textarea');
modalTextarea.rows = 6;
modalTextarea.style.width = '100%';
modalTextarea.style.padding = '10px';
modalTextarea.style.borderRadius = '8px';
modalTextarea.style.border = '1px solid #ccc';
modalTextarea.style.fontFamily = 'monospace';
modalTextarea.style.fontSize = '14px';
modalTextarea.style.resize = 'vertical';
modalTextarea.style.boxSizing = 'border-box';

const colorContainer = document.createElement('div');
colorContainer.style.display = 'flex';
colorContainer.style.alignItems = 'center';
colorContainer.style.gap = '10px';

const colorLabel = document.createElement('span');
colorLabel.textContent = 'Block Color:';
colorLabel.style.fontSize = '14px';
colorLabel.style.fontWeight = '500';

const modalColorInput = document.createElement('input');
modalColorInput.type = 'color';
modalColorInput.style.border = '1px solid #ccc';
modalColorInput.style.width = '36px';
modalColorInput.style.height = '36px';
modalColorInput.style.padding = '0';
modalColorInput.style.borderRadius = '6px';
modalColorInput.style.cursor = 'pointer';
modalColorInput.style.backgroundColor = 'transparent';

colorContainer.appendChild(colorLabel);
colorContainer.appendChild(modalColorInput);

const modalBtnContainer = document.createElement('div');
modalBtnContainer.style.display = 'flex';
modalBtnContainer.style.justifyContent = 'flex-end';
modalBtnContainer.style.gap = '10px';

const cancelModalBtn = document.createElement('button');
cancelModalBtn.textContent = 'Cancel';
cancelModalBtn.style.padding = '8px 16px';
cancelModalBtn.style.border = 'none';
cancelModalBtn.style.background = '#f2f2f7';
cancelModalBtn.style.borderRadius = '6px';
cancelModalBtn.style.cursor = 'pointer';

const saveModalBtn = document.createElement('button');
saveModalBtn.textContent = 'Save';
saveModalBtn.style.padding = '8px 16px';
saveModalBtn.style.border = 'none';
saveModalBtn.style.background = '#007aff';
saveModalBtn.style.color = '#fff';
saveModalBtn.style.borderRadius = '6px';
saveModalBtn.style.cursor = 'pointer';

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


// 2. Build the Edit/Delete Menu UI
const menu = document.createElement('div');
menu.style.position = 'absolute';
menu.style.display = 'none';
menu.style.background = '#fff';
menu.style.border = '1px solid #e5e5e5';
menu.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
menu.style.borderRadius = '10px';
menu.style.padding = '6px';
menu.style.zIndex = '1000';
menu.style.flexDirection = 'column';
menu.style.gap = '2px';
menu.style.minWidth = '140px';

const editCmdBtn = document.createElement('button');
editCmdBtn.textContent = 'Edit Commands / Color';
editCmdBtn.style.padding = '8px 12px';
editCmdBtn.style.border = 'none';
editCmdBtn.style.background = 'transparent';
editCmdBtn.style.cursor = 'pointer';
editCmdBtn.style.textAlign = 'left';
editCmdBtn.style.borderRadius = '6px';
editCmdBtn.style.fontSize = '14px';

const deleteBtn = document.createElement('button');
deleteBtn.textContent = 'Delete Block';
deleteBtn.style.padding = '8px 12px';
deleteBtn.style.border = 'none';
deleteBtn.style.background = 'transparent';
deleteBtn.style.color = '#ff3b30';
deleteBtn.style.cursor = 'pointer';
deleteBtn.style.textAlign = 'left';
deleteBtn.style.borderRadius = '6px';
deleteBtn.style.fontSize = '14px';

[editCmdBtn, deleteBtn].forEach(btn => {
    btn.onmouseover = () => btn.style.backgroundColor = '#f2f2f7';
    btn.onmouseout = () => btn.style.backgroundColor = 'transparent';
});

menu.appendChild(editCmdBtn);
menu.appendChild(deleteBtn);
document.body.appendChild(menu);

let activeEventId = null;

function hideMenu() {
    menu.style.display = 'none';
    activeEventId = null;
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

// Delete Logic
deleteBtn.addEventListener('click', () => {
    if (activeEventId) {
        const currentEventId = activeEventId;
        const slots = document.querySelectorAll(`.slot[data-event-id="${currentEventId}"]`);
        slots.forEach(slot => {
            slot.classList.remove('selected');
            slot.innerHTML = '';
            slot.style.backgroundColor = '';
            slot.style.borderBottom = '';
            delete slot.dataset.eventId;
        });

        delete eventDatabase[currentEventId];
        console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));
    }
    hideMenu();
});


// 3. Drag and Drop Interaction
let isDragging = false;
let currentDragSession = new Set();
let lastHoveredElement = null;

function toggleSlot(slot) {
    if (!slot || !slot.classList.contains('slot')) return;
    if (currentDragSession.has(slot)) return;

    currentDragSession.add(slot);
    slot.classList.add('selected');
}

calendar.addEventListener('pointerdown', (e) => {
    if (modalOverlay.style.display === 'flex') return;

    const slot = e.target.closest('.slot');
    if (!slot) return;

    if (slot.classList.contains('selected')) {
        isDragging = false;
        activeEventId = slot.dataset.eventId;

        menu.style.display = 'flex';
        const menuX = Math.min(e.clientX + 10, window.innerWidth - 150);
        menu.style.left = `${menuX}px`;
        menu.style.top = `${e.clientY + 10}px`;
        return;
    }

    hideMenu();
    isDragging = true;
    currentDragSession.clear();
    toggleSlot(slot);
    slot.releasePointerCapture(e.pointerId);
});

calendar.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== lastHoveredElement) {
        lastHoveredElement = el;
        const slot = el.closest('.slot');
        if (slot) toggleSlot(slot);
    }
});

window.addEventListener('pointerup', () => {
    if (!isDragging) return;
    isDragging = false;
    lastHoveredElement = null;

    if (currentDragSession.size > 0) {
        const savedSession = Array.from(currentDragSession);

        openModal('Enter CLI Commands', '$led set_hsv 85 255 255', '#33ff33', (cmdText, chosenColor) => {
            if (cmdText !== null && cmdText.trim() !== "") {
                const commandArray = cmdText.split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                const uniqueEventId = 'evt-' + Date.now();

                const newRecord = {
                    id: uniqueEventId,
                    commands: commandArray,
                    color: chosenColor,
                    slots: []
                };

                savedSession.forEach(slot => {
                    slot.dataset.eventId = uniqueEventId;
                    newRecord.slots.push({
                        day: slot.dataset.day,
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

calendar.addEventListener('contextmenu', e => e.preventDefault());