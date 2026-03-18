const calendar = document.getElementById('calendar');
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const startHour = 8; // 8 AM
const endHour = 20;  // 8 PM (12 hours total)

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
menu.style.minWidth = '120px';

const editBtn = document.createElement('button');
editBtn.textContent = 'Edit Name';
editBtn.style.padding = '8px 12px';
editBtn.style.border = 'none';
editBtn.style.background = 'transparent';
editBtn.style.cursor = 'pointer';
editBtn.style.textAlign = 'left';
editBtn.style.borderRadius = '6px';
editBtn.style.fontSize = '14px';

const deleteBtn = document.createElement('button');
deleteBtn.textContent = 'Delete Event';
deleteBtn.style.padding = '8px 12px';
deleteBtn.style.border = 'none';
deleteBtn.style.background = 'transparent';
deleteBtn.style.color = '#ff3b30';
deleteBtn.style.cursor = 'pointer';
deleteBtn.style.textAlign = 'left';
deleteBtn.style.borderRadius = '6px';
deleteBtn.style.fontSize = '14px';

[editBtn, deleteBtn].forEach(btn => {
    btn.onmouseover = () => btn.style.backgroundColor = '#f2f2f7';
    btn.onmouseout = () => btn.style.backgroundColor = 'transparent';
});

menu.appendChild(editBtn);
menu.appendChild(deleteBtn);
document.body.appendChild(menu);

let activeEventGroup = [];

function hideMenu() {
    menu.style.display = 'none';
    activeEventGroup = [];
}

document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target) && (!e.target.classList || !e.target.classList.contains('selected'))) {
        hideMenu();
    }
});

// Edit Button Logic (Updated to handle ID groupings)
editBtn.addEventListener('click', () => {
    if (activeEventGroup.length > 0) {
        // Find the current text to show in the prompt
        let currentText = 'New Event';
        const slotWithText = activeEventGroup.find(s => s.textContent.trim() !== '');
        if (slotWithText) currentText = slotWithText.textContent.trim();

        const newName = prompt('Edit event name:', currentText);

        if (newName !== null && newName.trim() !== "") {
            // Clear old text from all slots in this specific event
            activeEventGroup.forEach(slot => slot.innerHTML = '');

            // Regroup by day and apply new text to the top of each column
            const slotsByDay = {};
            activeEventGroup.forEach(slot => {
                const day = slot.dataset.day;
                if (!slotsByDay[day]) slotsByDay[day] = [];
                slotsByDay[day].push(slot);
            });

            for (const day in slotsByDay) {
                const daySlots = slotsByDay[day];
                daySlots.sort((a, b) => {
                    const timeA = a.dataset.time.split(':').map(Number);
                    const timeB = b.dataset.time.split(':').map(Number);
                    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                });
                daySlots[0].innerHTML = `<span class="slot-text">${newName}</span>`;
            }
        }
    }
    hideMenu();
});

// Delete Button Logic (Updated to only delete the specific ID)
deleteBtn.addEventListener('click', () => {
    activeEventGroup.forEach(slot => {
        slot.classList.remove('selected');
        slot.innerHTML = '';
        delete slot.dataset.eventId; // Remove the unique ID
    });
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
    const slot = e.target.closest('.slot');
    if (!slot) return;

    // IF CLICKING AN EXISTING EVENT: Show Menu
    if (slot.classList.contains('selected')) {
        isDragging = false;

        // Grab the unique ID of the event we clicked
        const eventId = slot.dataset.eventId;

        // Find ALL slots on the calendar that share this exact ID
        if (eventId) {
            activeEventGroup = Array.from(document.querySelectorAll(`.slot[data-event-id="${eventId}"]`));
        } else {
            // Fallback just in case
            activeEventGroup = [slot];
        }

        menu.style.display = 'flex';
        const menuX = Math.min(e.clientX + 10, window.innerWidth - 130);
        menu.style.left = `${menuX}px`;
        menu.style.top = `${e.clientY + 10}px`;
        return;
    }

    // IF CLICKING EMPTY SPACE: Start dragging
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

        setTimeout(() => {
            const eventText = prompt("Enter event name:", "New Event");
            if (eventText) {
                // Generate a unique ID for this specific event creation
                const uniqueEventId = 'evt-' + Date.now();

                const slotsByDay = {};
                savedSession.forEach(slot => {
                    // Tag every slot with the unique ID
                    slot.dataset.eventId = uniqueEventId;

                    const day = slot.dataset.day;
                    if (!slotsByDay[day]) slotsByDay[day] = [];
                    slotsByDay[day].push(slot);
                });

                for (const day in slotsByDay) {
                    const daySlots = slotsByDay[day];
                    daySlots.sort((a, b) => {
                        const timeA = a.dataset.time.split(':').map(Number);
                        const timeB = b.dataset.time.split(':').map(Number);
                        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                    });
                    const topSlot = daySlots[0];
                    topSlot.innerHTML = `<span class="slot-text">${eventText}</span>`;
                }
            } else {
                savedSession.forEach(slot => slot.classList.remove('selected'));
            }
        }, 10);
    }

    currentDragSession.clear();
});

calendar.addEventListener('contextmenu', e => e.preventDefault());