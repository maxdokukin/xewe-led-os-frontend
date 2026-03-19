(function () {
    const app = window.CalendarApp;
    const { calendar, state } = app;

    function updateDragSelection(currentSlot) {
        if (!state.dragAnchor || !currentSlot) return;
        if (currentSlot.dataset.day !== state.dragAnchor.dataset.day) return;

        const day = state.dragAnchor.dataset.day;
        const startRow = Math.min(
            Number(state.dragAnchor.dataset.row),
            Number(currentSlot.dataset.row)
        );
        const endRow = Math.max(
            Number(state.dragAnchor.dataset.row),
            Number(currentSlot.dataset.row)
        );

        const nextSession = new Set();

        calendar.querySelectorAll(`.slot[data-day="${day}"][data-row]`).forEach((slot) => {
            const row = Number(slot.dataset.row);
            const inRange = row >= startRow && row <= endRow;
            const isFree = !slot.dataset.eventId;

            if (inRange && isFree) {
                nextSession.add(slot);
                slot.classList.add('selected');
            } else if (state.currentDragSession.has(slot)) {
                slot.classList.remove('selected');
            }
        });

        state.currentDragSession = nextSession;
    }

    function bind() {
        if (app.interactions._bound) return;
        app.interactions._bound = true;

        window.addEventListener('resize', app.ui.updateNowIndicator);
        calendar.addEventListener('scroll', app.ui.updateNowIndicator);

        calendar.addEventListener('pointerdown', (e) => {
            if (app.els.modalOverlay.style.display === 'flex') return;
            if (e.button !== 0) return;

            const slot = e.target.closest('.slot[data-day][data-row]');
            if (!slot) return;

            if (slot.classList.contains('selected') && slot.dataset.eventId) {
                state.isDragging = false;
                app.actions.showMenu(e.clientX, e.clientY, {
                    eventId: slot.dataset.eventId,
                    targetSlot: slot
                });
                return;
            }

            app.actions.hideMenu();

            state.isDragging = true;
            state.dragAnchor = slot;
            state.currentDragSession = new Set();

            if (calendar.setPointerCapture) {
                calendar.setPointerCapture(e.pointerId);
            }

            updateDragSelection(slot);
        });

        calendar.addEventListener('pointermove', (e) => {
            if (!state.isDragging) return;

            const el = document.elementFromPoint(e.clientX, e.clientY);
            const slot = el ? el.closest('.slot[data-day][data-row]') : null;

            if (slot) {
                updateDragSelection(slot);
            }
        });

        window.addEventListener('pointerup', () => {
            if (!state.isDragging) return;

            state.isDragging = false;
            state.dragAnchor = null;

            if (state.currentDragSession.size > 0) {
                const savedSession = Array.from(state.currentDragSession);

                app.ui.openModal(
                    'Enter CLI Commands',
                    '$led set_hsv 85 255 255',
                    '#33ff33',
                    (cmdText, chosenColor) => {
                        if (cmdText !== null && cmdText.trim() !== "") {
                            const commandArray = cmdText
                                .split('\n')
                                .map(cmd => cmd.trim())
                                .filter(cmd => cmd !== "");

                            app.actions.createEventFromSlots(savedSession, commandArray, chosenColor);
                        } else {
                            savedSession.forEach((slot) => {
                                slot.classList.remove('selected');
                                slot.style.backgroundColor = '';
                            });
                        }
                    }
                );
            }

            state.currentDragSession.clear();
        });

        calendar.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            if (app.els.modalOverlay.style.display === 'flex') return;

            const slot = e.target.closest('.slot[data-day][data-row]');
            if (!slot) {
                app.actions.hideMenu();
                return;
            }

            app.actions.showMenu(e.clientX, e.clientY, {
                eventId: slot.dataset.eventId || null,
                targetSlot: slot
            });
        });
    }

    app.interactions.updateDragSelection = updateDragSelection;
    app.interactions.bind = bind;

    app.ui.init();
    app.actions.bindMenuActions();
    app.interactions.bind();
})();