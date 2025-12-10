import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SESSION_STORAGE_KEY = "remoteControlRoomCode";

export function useRemoteControl() {
  const [assignedRoomCode, setAssignedRoomCode] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  const cursorElementRef = useRef(null);
  const windowWidthRef = useRef(0);
  const windowHeightRef = useRef(0);
  const cursorXRef = useRef(0);
  const cursorYRef = useRef(0);
  const cursorVisibleRef = useRef(false);
  const lastHoveredElementRef = useRef(null);
  const lastHoveredAssociatedLabelsRef = useRef([]);
  const manuallyFocusedElementRef = useRef(null);
  const socketRef = useRef(null);
  const assignedRoomCodeRef = useRef(null);
  const isMountedRef = useRef(true);

  function getUniqueSelector(el) {
    if (!el || !(el instanceof Element)) return null;
    if (el.id) return `#${el.id}`;
    let selector = el.tagName.toLowerCase();
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children);
      const index = siblings.indexOf(el);
      if (index > -1) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    return selector;
  }

  function updateCursorPosition() {
    if (cursorElementRef.current) {
      cursorElementRef.current.style.left = `${cursorXRef.current}px`;
      cursorElementRef.current.style.top = `${cursorYRef.current}px`;
      if (assignedRoomCodeRef.current && socketRef.current) {
        socketRef.current.emit("report_cursor_position", {
          roomId: assignedRoomCodeRef.current,
          pos: { x: cursorXRef.current, y: cursorYRef.current }
        });
      }
    }
  }

  function updateCursorVisibility() {
    if (cursorElementRef.current) {
      cursorElementRef.current.classList.toggle(
        "visible",
        cursorVisibleRef.current
      );
    }
  }

  function removeManualFocusVisuals() {
    if (manuallyFocusedElementRef.current) {
      manuallyFocusedElementRef.current.classList.remove("manual-focus");
    }
    manuallyFocusedElementRef.current = null;
  }

  function applyManualFocusVisuals(element) {
    removeManualFocusVisuals();
    if (
      element &&
      ((element.tagName === "INPUT" && element.type === "text") ||
        element.tagName === "TEXTAREA")
    ) {
      element.classList.add("manual-focus");
      manuallyFocusedElementRef.current = element;
    }
  }

  function removeManualHover() {
    if (lastHoveredElementRef.current) {
      lastHoveredElementRef.current.classList.remove("manual-hover");
    }
    lastHoveredAssociatedLabelsRef.current.forEach((label) =>
      label.classList.remove("manual-hover-associated")
    );
    lastHoveredElementRef.current = null;
    lastHoveredAssociatedLabelsRef.current = [];
  }

  function isInteractiveForHover(element) {
    if (!element) return false;
    const tagName = element.tagName;
    const type = element.type ? element.type.toLowerCase() : null;
    if (tagName === "LABEL" && element.htmlFor) {
      const input = document.getElementById(element.htmlFor);
      if (input && (input.type === "text" || input.tagName === "TEXTAREA")) {
        return false;
      }
      return true;
    }
    if (
      tagName === "BUTTON" ||
      tagName === "A" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      (tagName === "INPUT" &&
        [
          "text",
          "button",
          "submit",
          "reset",
          "radio",
          "checkbox",
          "image"
        ].includes(type)) ||
      element.classList.contains("clickable-box")
    ) {
      return true;
    }
    return false;
  }

  function handleManualHover() {
    if (!cursorVisibleRef.current) return;
    let elementUnderCursor = document.elementFromPoint(
      cursorXRef.current,
      cursorYRef.current
    );
    let targetInteractiveElement = null;
    let associatedLabelsToHover = [];

    if (elementUnderCursor) {
      if (isInteractiveForHover(elementUnderCursor)) {
        targetInteractiveElement = elementUnderCursor;
        if (
          elementUnderCursor.id &&
          (elementUnderCursor.type === "radio" ||
            elementUnderCursor.type === "checkbox")
        ) {
          associatedLabelsToHover = Array.from(
            document.querySelectorAll(`label[for="${elementUnderCursor.id}"]`)
          );
        }
      } else if (
        elementUnderCursor.tagName === "LABEL" &&
        elementUnderCursor.htmlFor
      ) {
        const input = document.getElementById(elementUnderCursor.htmlFor);
        if (input && isInteractiveForHover(input)) {
          targetInteractiveElement =
            input.type === "text" || input.tagName === "TEXTAREA"
              ? input
              : elementUnderCursor;
        }
      }
    }

    if (targetInteractiveElement !== lastHoveredElementRef.current) {
      removeManualHover();
      if (targetInteractiveElement) {
        targetInteractiveElement.classList.add("manual-hover");
        lastHoveredElementRef.current = targetInteractiveElement;
        associatedLabelsToHover.forEach((label) =>
          label.classList.add("manual-hover-associated")
        );
        lastHoveredAssociatedLabelsRef.current = associatedLabelsToHover;
      }
    } else if (targetInteractiveElement) {
      const currentLabelSelectors = associatedLabelsToHover.map((l) =>
        getUniqueSelector(l)
      );
      lastHoveredAssociatedLabelsRef.current =
        lastHoveredAssociatedLabelsRef.current.filter((label) => {
          if (currentLabelSelectors.includes(getUniqueSelector(label))) {
            return true;
          } else {
            label.classList.remove("manual-hover-associated");
            return false;
          }
        });
      associatedLabelsToHover.forEach((label) => {
        if (!lastHoveredAssociatedLabelsRef.current.includes(label)) {
          label.classList.add("manual-hover-associated");
          lastHoveredAssociatedLabelsRef.current.push(label);
        }
      });
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {
        isMountedRef.current = false;
      };
    }
    
    windowWidthRef.current = window.innerWidth;
    windowHeightRef.current = window.innerHeight;
    cursorXRef.current = window.innerWidth / 2;
    cursorYRef.current = window.innerHeight / 2;
    
    const newSocket = io();
    socketRef.current = newSocket;
    setSocket(newSocket);

    const initializeCursor = () => {
      const cursorElement = document.getElementById("remote-cursor");
      if (cursorElement) {
        cursorElementRef.current = cursorElement;
        updateCursorPosition();
        updateCursorVisibility();
      } else {
        setTimeout(initializeCursor, 100);
      }
    };
    
    initializeCursor();

    newSocket.on("connect", () => {
      console.log(`[useRemoteControl] Connected as App (Socket: ${newSocket.id}). Checking for previous room...`);
      removeManualFocusVisuals();
      removeManualHover();

      const previousRoomCode = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (previousRoomCode) {
        console.log(`[useRemoteControl] Found previous room code: ${previousRoomCode}. Attempting to rejoin...`);
        newSocket.emit("rejoin_app_room", previousRoomCode);
      } else {
        console.log("[useRemoteControl] No previous room code found. Requesting a new room...");
        newSocket.emit("register_app_room");
      }
    });

    newSocket.on("your_room_id", (assignedCode) => {
      const code = assignedCode.toUpperCase();
      assignedRoomCodeRef.current = code;
      setAssignedRoomCode(code);
      console.log(`[useRemoteControl] Assigned/Confirmed Room Code: ${code}`);
      sessionStorage.setItem(SESSION_STORAGE_KEY, code);
      setConnected(true);
    });

    newSocket.on("rejoin_failed", (failedRoomCode) => {
      console.warn(`Rejoin failed for room ${failedRoomCode}. Requesting a new room.`);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setAssignedRoomCode(null);
      newSocket.emit("register_app_room");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected...", reason);
      cursorVisibleRef.current = false;
      updateCursorVisibility();
      removeManualFocusVisuals();
      removeManualHover();
      setConnected(false);
    });

    newSocket.on("initial_state", (state) => {
      console.log("Received initial state for this room:", state);
      if (state) {
        cursorXRef.current = state.cursor?.x ?? windowWidthRef.current / 2;
        cursorYRef.current = state.cursor?.y ?? windowHeightRef.current / 2;
        updateCursorPosition();
        removeManualFocusVisuals();
        if (state.focusedElementSelector) {
          try {
            const focusedEl = document.querySelector(state.focusedElementSelector);
            if (focusedEl) {
              focusedEl.focus({ preventScroll: true });
              applyManualFocusVisuals(focusedEl);
              if (
                state.focusedElementValue !== undefined &&
                (focusedEl.tagName === "INPUT" || focusedEl.tagName === "TEXTAREA")
              ) {
                focusedEl.value = state.focusedElementValue;
              }
            }
          } catch (e) {
            console.warn("Error applying initial focus selector:", e);
          }
        }
      }
    });

    newSocket.on("set_cursor_visibility", (isVisible) => {
      console.log("Setting cursor visibility:", isVisible);
      if (cursorVisibleRef.current !== isVisible) {
        cursorVisibleRef.current = isVisible;
        updateCursorVisibility();
        if (!cursorVisibleRef.current) {
          removeManualHover();
        } else {
          handleManualHover();
        }
      }
    });

    newSocket.on("cursor_move", (data) => {
      if (!cursorVisibleRef.current) return;
      const deltaX = data.deltaX || 0;
      const deltaY = data.deltaY || 0;
      cursorXRef.current += deltaX;
      cursorYRef.current += deltaY;
      cursorXRef.current = Math.max(
        0,
        Math.min(windowWidthRef.current, cursorXRef.current)
      );
      cursorYRef.current = Math.max(
        0,
        Math.min(windowHeightRef.current, cursorYRef.current)
      );
      updateCursorPosition();
      handleManualHover();
    });

    newSocket.on("tap", (data) => {
      let elementUnderCursor = document.elementFromPoint(
        cursorXRef.current,
        cursorYRef.current
      );
      console.log("Tap received for this room. Element:", elementUnderCursor);
      let finalTargetElement = elementUnderCursor;
      removeManualFocusVisuals();

      if (
        elementUnderCursor &&
        elementUnderCursor.tagName === "LABEL" &&
        elementUnderCursor.htmlFor
      ) {
        const correspondingInput = document.getElementById(elementUnderCursor.htmlFor);
        if (correspondingInput) {
          finalTargetElement = correspondingInput;
        }
      }

      if (finalTargetElement) {
        const isTargetTextInput =
          (finalTargetElement.tagName === "INPUT" &&
            finalTargetElement.type === "text") ||
          finalTargetElement.tagName === "TEXTAREA";
        const previousActiveElement = document.activeElement;

        if (typeof finalTargetElement.focus === "function") {
          finalTargetElement.focus({ preventScroll: true });
        }
        if (typeof finalTargetElement.click === "function") {
          finalTargetElement.click();
        }

        const newActiveElement = document.activeElement;
        const focusNowOnTextInput =
          newActiveElement === finalTargetElement && isTargetTextInput;

        if (focusNowOnTextInput) {
          applyManualFocusVisuals(finalTargetElement);
        }

        const focusedSelector = getUniqueSelector(
          newActiveElement === document.body ? null : newActiveElement
        );
        let reportData = {
          roomId: assignedRoomCodeRef.current,
          focusInfo: { selector: focusedSelector }
        };
        if (
          newActiveElement &&
          (newActiveElement.tagName === "INPUT" ||
            newActiveElement.tagName === "TEXTAREA")
        ) {
          reportData.focusInfo.value = newActiveElement.value;
        }
        newSocket.emit("report_focus_change", reportData);

        if (cursorElementRef.current) {
          cursorElementRef.current.style.backgroundColor = "blue";
          setTimeout(() => {
            if (cursorElementRef.current) {
              cursorElementRef.current.style.backgroundColor = "red";
            }
          }, 150);
        }
      } else {
        const previousActiveElement = document.activeElement;
        if (
          previousActiveElement &&
          typeof previousActiveElement.blur === "function" &&
          previousActiveElement !== document.body
        ) {
          previousActiveElement.blur();
        }
        newSocket.emit("report_focus_change", {
          roomId: assignedRoomCodeRef.current,
          focusInfo: { selector: null }
        });
        if (cursorElementRef.current) {
          cursorElementRef.current.style.backgroundColor = "darkred";
          setTimeout(() => {
            if (cursorElementRef.current) {
              cursorElementRef.current.style.backgroundColor = "red";
            }
          }, 150);
        }
      }
      handleManualHover();
    });

    newSocket.on("key_input", (data) => {
      const key = data.key;
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
      ) {
        const inputElement = activeElement;
        const currentValue = inputElement.value;
        let valueChanged = false;

        if (key === "Backspace") {
          if (currentValue.length > 0) {
            inputElement.value = currentValue.substring(0, currentValue.length - 1);
            inputElement.selectionStart = inputElement.selectionEnd =
              inputElement.value.length;
            valueChanged = true;
          }
        } else if (key === "Enter") {
          if (inputElement.tagName === "TEXTAREA") {
            inputElement.value =
              currentValue + "\n";
            inputElement.selectionStart = inputElement.selectionEnd =
              inputElement.value.length;
            valueChanged = true;
          } else if (inputElement.form) {
            const form = inputElement.form;
            const submitEvent = new Event("submit", {
              bubbles: true,
              cancelable: true
            });
            form.dispatchEvent(submitEvent);
          }
        } else if (key.length === 1 || key === " ") {
          inputElement.value = currentValue + key;
          inputElement.selectionStart = inputElement.selectionEnd =
            inputElement.value.length;
          valueChanged = true;
        } else {
          console.log("Unhandled special key:", key);
        }

        if (valueChanged) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
          )?.set;
          
          const setter = inputElement.tagName === "TEXTAREA" 
            ? nativeTextAreaValueSetter 
            : nativeInputValueSetter;
          
          if (setter) {
            setter.call(inputElement, inputElement.value);
          }
          
          const inputEvent = new Event("input", { bubbles: true, cancelable: true });
          inputElement.dispatchEvent(inputEvent);
          
          const changeEvent = new Event("change", { bubbles: true, cancelable: true });
          inputElement.dispatchEvent(changeEvent);
          
          const focusedSelector = getUniqueSelector(inputElement);
          newSocket.emit("report_focus_change", {
            roomId: assignedRoomCodeRef.current,
            focusInfo: { selector: focusedSelector, value: inputElement.value }
          });
        }
      } else {
        console.log("Key input received, but no suitable element focused.");
      }
    });

    newSocket.on("scroll", (data) => {
      const deltaX = data.deltaX || 0;
      const deltaY = data.deltaY || 0;
      
      const venueOverlayScrollable = document.querySelector('[data-venue-overlay-scrollable="true"]');
      if (venueOverlayScrollable && venueOverlayScrollable.offsetParent !== null) {
        venueOverlayScrollable.scrollBy({
          left: deltaX,
          top: deltaY,
          behavior: 'auto'
        });
        return;
      }
      
      const activeElement = document.activeElement;
      const scrollableElement = activeElement && (
        activeElement.scrollHeight > activeElement.clientHeight ||
        activeElement.scrollWidth > activeElement.clientWidth
      ) ? activeElement : window;
      
      if (scrollableElement === window) {
        window.scrollBy({
          left: deltaX,
          top: deltaY,
          behavior: 'auto'
        });
      } else {
        scrollableElement.scrollBy({
          left: deltaX,
          top: deltaY,
          behavior: 'auto'
        });
      }
    });

    const handleResize = () => {
      windowWidthRef.current = window.innerWidth;
      windowHeightRef.current = window.innerHeight;
      cursorXRef.current = Math.max(
        0,
        Math.min(windowWidthRef.current, cursorXRef.current)
      );
      cursorYRef.current = Math.max(
        0,
        Math.min(windowHeightRef.current, cursorYRef.current)
      );
      updateCursorPosition();
      handleManualHover();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener("resize", handleResize);
    }

    const handleFocusIn = (event) => {
      const target = event.target;
      if (
        target &&
        target !== document.body &&
        target !== manuallyFocusedElementRef.current &&
        assignedRoomCodeRef.current
      ) {
        const selector = getUniqueSelector(target);
        let reportData = { roomId: assignedRoomCodeRef.current, focusInfo: { selector } };
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          reportData.focusInfo.value = target.value;
        }
        newSocket.emit("report_focus_change", reportData);
        applyManualFocusVisuals(target);
      }
    };

    const handleFocusOut = (event) => {
      const relatedTarget = event.relatedTarget;
      if (
        (!relatedTarget || relatedTarget === document.body) &&
        assignedRoomCodeRef.current
      ) {
        newSocket.emit("report_focus_change", {
          roomId: assignedRoomCodeRef.current,
          focusInfo: { selector: null }
        });
        removeManualFocusVisuals();
      }
    };

    if (typeof document !== 'undefined') {
      document.body.addEventListener("focusin", handleFocusIn);
      document.body.addEventListener("focusout", handleFocusOut);
    }

    return () => {
      isMountedRef.current = false;
      if (newSocket) {
        newSocket.close();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener("resize", handleResize);
      }
      if (typeof document !== 'undefined') {
        document.body.removeEventListener("focusin", handleFocusIn);
        document.body.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, []);

  return { assignedRoomCode, connected };
}

