const calendar = document.getElementById('calendar');
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const startHour = 8;
const endHour = 20;

// --- DATA LAYER ---
let eventDatabase = {};

// 1. Build the Grid
function initCalendar() {
    const corner = document.createElement('div');
    corner.className = 'header-corner';
    calendar.appendChild(corner);

    const todayIdx = new Date().getDay();
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
        for(let half = 0; half < 2; half++) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            if (half === 0) {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayHour = h % 12 === 0 ? 12 : h % 12;
                timeLabel.innerHTML = `<span>${displayHour} ${ampm}</span>`;
            }
            calendar.appendChild(timeLabel);

            for (let d = 0; d < 7; d++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.day = d;
                slot.dataset.time = `${h}:${half === 0 ? '00' : '30'}`;
                calendar.appendChild(slot);
            }
        }
    }
}

initCalendar();

// --- UI HELPERS ---
function renderEventUI(eventId) {
    const event = eventDatabase[eventId];
    if (!event) return;

    const slots = document.querySelectorAll(`.slot[data-event-id="${eventId}"]`);
    slots.forEach(s => s.innerHTML = '');

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
                    color: inherit;
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
modalBox.appendChild(modalBtnContainer);
modalOverlay.appendChild(modalBox);
document.body.appendChild(modalOverlay);

let modalCallback = null;

function openModal(title, defaultText, callback) {
    modalTitle.textContent = title;
    modalTextarea.value = defaultText;
    modalCallback = callback;
    modalOverlay.style.display = 'flex';
    modalTextarea.focus();
}

function closeModal() {
    modalOverlay.style.display = 'none';
    modalCallback = null;
}

cancelModalBtn.onclick = () => {
    if (modalCallback) modalCallback(null);
    closeModal();
};

saveModalBtn.onclick = () => {
    if (modalCallback) modalCallback(modalTextarea.value);
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
editCmdBtn.textContent = 'Edit Commands';
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

// Edit Existing Commands Logic (BUG FIXED HERE)
editCmdBtn.addEventListener('click', () => {
    if (activeEventId && eventDatabase[activeEventId]) {
        // We MUST save the ID to a local variable before hideMenu() wipes it out
        const currentEventId = activeEventId;
        const currentCmds = eventDatabase[currentEventId].commands.join('\n');

        openModal('Edit Commands', currentCmds, (editedCmds) => {
            if (editedCmds !== null) {
                const newCommandArray = editedCmds.split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                eventDatabase[currentEventId].commands = newCommandArray;
                renderEventUI(currentEventId);
                console.log("Updated Database:", JSON.stringify(eventDatabase, null, 2));
            }
        });
    }
    hideMenu(); // This wipes activeEventId, but our callback uses currentEventId now!
});

// Delete Button Logic
deleteBtn.addEventListener('click', () => {
    if (activeEventId) {
        const currentEventId = activeEventId;
        const slots = document.querySelectorAll(`.slot[data-event-id="${currentEventId}"]`);
        slots.forEach(slot => {
            slot.classList.remove('selected');
            slot.innerHTML = '';
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

        openModal('Enter CLI Commands', 'npm run build\npm2 restart all', (cmdText) => {
            if (cmdText && cmdText.trim() !== "") {
                const commandArray = cmdText.split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                const uniqueEventId = 'evt-' + Date.now();

                const newRecord = {
                    id: uniqueEventId,
                    commands: commandArray,
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
                savedSession.forEach(slot => slot.classList.remove('selected'));
            }
        });
    }

    currentDragSession.clear();
});

calendar.addEventListener('contextmenu', e => e.preventDefault());