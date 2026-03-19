// calendar-actions.js

(function () {
    const app = window.CalendarApp;
    const { calendar, state, els, utils } = app;

    function hideMenu() {
        if (!els.menu) return;
        els.menu.style.display = 'none';
        state.activeEventId = null;
        state.menuTargetSlot = null;
    }

    function showMenu(x, y, options = {}) {
        const { eventId = null, targetSlot = null } = options;

        state.activeEventId = eventId;
        state.menuTargetSlot = targetSlot;

        const hasEvent = !!eventId;
        const canPaste =
            !!targetSlot &&
            !targetSlot.dataset.eventId &&
            !!state.copiedBlockData &&
            canPasteBlockAt(targetSlot, state.copiedBlockData);

        els.editCmdBtn.style.display = hasEvent ? 'block' : 'none';
        els.copyBtn.style.display = hasEvent ? 'block' : 'none';
        els.deleteBtn.style.display = hasEvent ? 'block' : 'none';

        els.pasteBtn.style.display = targetSlot ? 'block' : 'none';
        els.pasteBtn.disabled = !canPaste;
        els.pasteBtn.style.opacity = canPaste ? '1' : '0.5';
        els.pasteBtn.style.cursor = canPaste ? 'pointer' : 'not-allowed';

        els.menu.style.display = 'flex';
        els.menu.style.left = `${Math.min(x + 10, window.innerWidth - 180)}px`;
        els.menu.style.top = `${Math.min(y + 10, window.innerHeight - 220)}px`;
    }

    function clearEventSlots(eventId) {
        const slots = calendar.querySelectorAll(`.slot[data-event-id="${eventId}"]`);
        slots.forEach((slot) => {
            slot.classList.remove('selected');
            slot.innerHTML = '';
            slot.style.backgroundColor = '';
            delete slot.dataset.eventId;
        });
    }

    function deleteEvent(eventId) {
        if (!eventId || !state.eventDatabase[eventId]) return;

        clearEventSlots(eventId);
        delete state.eventDatabase[eventId];
        console.log("Updated Database:", JSON.stringify(state.eventDatabase, null, 2));
    }

    function editEvent(eventId) {
        const event = state.eventDatabase[eventId];
        if (!event) return;

        const currentCmds = event.commands.join('\n');
        const currentColor = event.color || '#007aff';

        app.ui.openModal('Edit Block', currentCmds, currentColor, (editedCmds, newColor) => {
            if (editedCmds !== null) {
                const newCommandArray = editedCmds
                    .split('\n')
                    .map(cmd => cmd.trim())
                    .filter(cmd => cmd !== "");

                state.eventDatabase[eventId].commands = newCommandArray;
                state.eventDatabase[eventId].color = newColor;
                app.ui.renderEventUI(eventId);

                console.log("Updated Database:", JSON.stringify(state.eventDatabase, null, 2));
            }
        });
    }

    function createEventFromSlots(slotList, commandArray, color) {
        const uniqueEventId = utils.generateEventId();

        const newRecord = {
            id: uniqueEventId,
            commands: commandArray,
            color: color,
            slots: []
        };

        slotList.forEach((slot) => {
            slot.dataset.eventId = uniqueEventId;
            slot.classList.add('selected');

            newRecord.slots.push({
                day: Number(slot.dataset.day),
                time: slot.dataset.time
            });
        });

        state.eventDatabase[uniqueEventId] = newRecord;
        console.log("Updated Database:", JSON.stringify(state.eventDatabase, null, 2));
        app.ui.renderEventUI(uniqueEventId);

        return uniqueEventId;
    }

    function copyEventToClipboard(eventId) {
        const event = state.eventDatabase[eventId];
        if (!event || !event.slots || event.slots.length === 0) return;

        const normalizedSlots = event.slots.map((slot) => ({
            day: Number(slot.day),
            row: utils.timeToRow(slot.time)
        }));

        const minDay = Math.min(...normalizedSlots.map(s => s.day));
        const minRow = Math.min(...normalizedSlots.map(s => s.row));

        state.copiedBlockData = {
            commands: [...event.commands],
            color: event.color || '#007aff',
            offsets: normalizedSlots.map((slot) => ({
                dayOffset: slot.day - minDay,
                rowOffset: slot.row - minRow
            }))
        };
    }

    function canPasteBlockAt(targetSlot, clipboardData = state.copiedBlockData) {
        if (!targetSlot || !clipboardData) return false;

        const baseDay = Number(targetSlot.dataset.day);
        const baseRow = Number(targetSlot.dataset.row);

        for (const offset of clipboardData.offsets) {
            const targetDay = baseDay + offset.dayOffset;
            const targetRow = baseRow + offset.rowOffset;

            if (targetDay < 0 || targetDay > 6) return false;
            if (targetRow < 0 || targetRow >= utils.getTotalRows()) return false;

            const slot = utils.getSlotByDayRow(targetDay, targetRow);
            if (!slot || slot.dataset.eventId) return false;
        }

        return true;
    }

    function pasteCopiedBlockAt(targetSlot) {
        if (!targetSlot || !state.copiedBlockData) return false;
        if (!canPasteBlockAt(targetSlot, state.copiedBlockData)) return false;

        const baseDay = Number(targetSlot.dataset.day);
        const baseRow = Number(targetSlot.dataset.row);
        const uniqueEventId = utils.generateEventId();

        const newRecord = {
            id: uniqueEventId,
            commands: [...state.copiedBlockData.commands],
            color: state.copiedBlockData.color,
            slots: []
        };

        state.copiedBlockData.offsets.forEach((offset) => {
            const day = baseDay + offset.dayOffset;
            const row = baseRow + offset.rowOffset;
            const slot = utils.getSlotByDayRow(day, row);

            if (slot) {
                slot.dataset.eventId = uniqueEventId;
                slot.classList.add('selected');

                newRecord.slots.push({
                    day,
                    time: utils.rowToTime(row)
                });
            }
        });

        state.eventDatabase[uniqueEventId] = newRecord;
        app.ui.renderEventUI(uniqueEventId);
        console.log("Updated Database:", JSON.stringify(state.eventDatabase, null, 2));

        return true;
    }

    async function fetchAndLoadSchedules() {
        try {
            const response = await fetch('/schedule/json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            for (const id in state.eventDatabase) {
                clearEventSlots(id);
            }
            state.eventDatabase = {};

            for (const key in data) {
                const evt = data[key];
                const slotsArray = [];
                const eventId = evt.id.toString();

                // --- NEW LOGIC: Parse commands cleanly ---
                let cleanCommands = [];
                if (Array.isArray(evt.commands)) {
                    evt.commands.forEach(cmdStr => {
                        // Extract anything between double quotes
                        const matches = cmdStr.match(/"([^"]+)"/g);
                        if (matches) {
                            // Strip out the quotes and push them individually
                            matches.forEach(m => {
                                cleanCommands.push(m.replace(/"/g, ''));
                            });
                        } else {
                            // Fallback just in case they aren't quoted
                            cleanCommands.push(cmdStr);
                        }
                    });
                }

                for (let m = evt.start_time; m < evt.end_time; m += 15) {
                    const hour = Math.floor(m / 60);
                    const minute = (m % 60).toString().padStart(2, '0');
                    const timeStr = `${hour}:${minute}`;

                    slotsArray.push({
                        day: evt.day,
                        time: timeStr
                    });

                    const domSlot = calendar.querySelector(`.slot[data-day="${evt.day}"][data-time="${timeStr}"]`);
                    if (domSlot) {
                        domSlot.dataset.eventId = eventId;
                    }
                }

                state.eventDatabase[eventId] = {
                    id: eventId,
                    commands: cleanCommands, // Passing the cleaned array here!
                    color: evt.color || '#33ff33',
                    slots: slotsArray
                };
            }

            for (const id in state.eventDatabase) {
                app.ui.renderEventUI(id);
            }
            console.log("Loaded Database from Server:", state.eventDatabase);

        } catch (error) {
            console.error("Failed to load schedules from server:", error);
        }
    }

    function bindMenuActions() {
        if (app.actions._bound) return;
        app.actions._bound = true;

        document.addEventListener('pointerdown', (e) => {
            const clickedInsideMenu = els.menu && els.menu.contains(e.target);
            const clickedInsideModal = els.modalOverlay && els.modalOverlay.contains(e.target);
            const clickedSelectedSlot = e.target.closest && e.target.closest('.slot.selected');

            if (!clickedInsideMenu && !clickedInsideModal && !clickedSelectedSlot) {
                hideMenu();
            }
        });

        els.editCmdBtn.addEventListener('click', () => {
            if (state.activeEventId) {
                editEvent(state.activeEventId);
            }
            hideMenu();
        });

        els.copyBtn.addEventListener('click', () => {
            if (state.activeEventId) {
                copyEventToClipboard(state.activeEventId);
            }
            hideMenu();
        });

        els.pasteBtn.addEventListener('click', () => {
            if (state.menuTargetSlot && state.copiedBlockData) {
                pasteCopiedBlockAt(state.menuTargetSlot);
            }
            hideMenu();
        });

        els.deleteBtn.addEventListener('click', () => {
            if (state.activeEventId) {
                deleteEvent(state.activeEventId);
            }
            hideMenu();
        });
    }

    app.actions.hideMenu = hideMenu;
    app.actions.showMenu = showMenu;
    app.actions.clearEventSlots = clearEventSlots;
    app.actions.deleteEvent = deleteEvent;
    app.actions.editEvent = editEvent;
    app.actions.createEventFromSlots = createEventFromSlots;
    app.actions.copyEventToClipboard = copyEventToClipboard;
    app.actions.canPasteBlockAt = canPasteBlockAt;
    app.actions.pasteCopiedBlockAt = pasteCopiedBlockAt;
    app.actions.bindMenuActions = bindMenuActions;
    app.actions.fetchAndLoadSchedules = fetchAndLoadSchedules;
})();