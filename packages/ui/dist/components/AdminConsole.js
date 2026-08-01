import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../store.js';
export const AdminConsole = ({ onExecuteCommand, onGetAutocomplete, onClose }) => {
    const { consoleOpen, adminUser } = useUIStore();
    const [inputVal, setInputVal] = useState('');
    const [logHistory, setLogHistory] = useState([
        { id: '0', timestamp: new Date().toLocaleTimeString(), command: 'auth check', output: 'Серверный токен администратора подтвержден [ROLE: ADMIN].', status: 'SUCCESS' }
    ]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [commandHistory, setCommandHistory] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const inputRef = useRef(null);
    const logEndRef = useRef(null);
    useEffect(() => {
        if (consoleOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [consoleOpen]);
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logHistory]);
    if (!consoleOpen)
        return null;
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (!inputVal.trim())
                return;
            const res = onExecuteCommand(inputVal);
            setLogHistory(prev => [...prev, { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), command: res.command, output: res.output, status: res.status }]);
            setCommandHistory(prev => [...prev, inputVal]);
            setHistoryIndex(-1);
            setInputVal('');
            setSuggestions([]);
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            const options = onGetAutocomplete(inputVal);
            if (options.length > 0) {
                setInputVal(options[0] + ' ');
                setSuggestions(options);
            }
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0)
                return;
            const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(nextIdx);
            setInputVal(commandHistory[nextIdx]);
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1)
                return;
            const nextIdx = historyIndex + 1;
            if (nextIdx >= commandHistory.length) {
                setHistoryIndex(-1);
                setInputVal('');
            }
            else {
                setHistoryIndex(nextIdx);
                setInputVal(commandHistory[nextIdx]);
            }
        }
        else if (e.key === 'Escape' || e.key === '`' || e.key === '~') {
            e.preventDefault();
            onClose();
        }
    };
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputVal(val);
        if (val.trim()) {
            setSuggestions(onGetAutocomplete(val));
        }
        else {
            setSuggestions([]);
        }
    };
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '45vh',
            backgroundColor: 'rgba(10, 15, 25, 0.92)',
            borderBottom: '2px solid #00ffc8',
            boxShadow: '0 10px 30px rgba(0, 255, 200, 0.3)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Chakra Petch', monospace",
            color: '#e0f7fc',
            padding: '12px 20px',
            boxSizing: 'border-box'
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(0, 255, 200, 0.2)', paddingBottom: '6px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { backgroundColor: '#00ffc8', color: '#05101a', padding: '2px 8px', fontWeight: 'bold', borderRadius: '2px', fontSize: '0.8rem' }, children: "[RA4 ADMIN CONSOLE v2.0]" }), _jsxs("span", { style: { fontSize: '0.85rem', color: '#80e5ff' }, children: ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ", _jsx("strong", { style: { color: '#00ffc8' }, children: adminUser?.nickname || 'Админ' }), " | \u0421\u0442\u0430\u0442\u0443\u0441: ", _jsx("span", { style: { color: '#00ffc8' }, children: "\u0410\u0412\u0422\u041E\u0420\u0418\u0417\u041E\u0412\u0410\u041D (SERVER-TOKEN VALIDATED)" })] })] }), _jsx("button", { onClick: onClose, style: {
                            background: 'none',
                            border: '1px solid #ff2a4b',
                            color: '#ff2a4b',
                            cursor: 'pointer',
                            padding: '2px 10px',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                        }, children: "[ \u0417\u0410\u041A\u0420\u042B\u0422\u042C ~ ]" })] }), _jsxs("div", { style: {
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 255, 200, 0.2)',
                    padding: '10px',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4'
                }, children: [logHistory.map((item) => (_jsxs("div", { style: { marginBottom: '6px' }, children: [_jsxs("span", { style: { color: '#5090a0', marginRight: '8px' }, children: ["[", item.timestamp, "]"] }), _jsxs("span", { style: { color: '#00ffc8', fontWeight: 'bold' }, children: ["> ", item.command] }), _jsx("pre", { style: { margin: '2px 0 0 16px', color: item.status === 'ERROR' ? '#ff2a4b' : item.status === 'INFO' ? '#80e5ff' : '#e0f7fc', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }, children: item.output })] }, item.id))), _jsx("div", { ref: logEndRef })] }), suggestions.length > 0 && (_jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '0.8rem', color: '#80e5ff' }, children: [_jsx("span", { children: "\u0410\u0432\u0442\u043E\u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 [Tab]:" }), suggestions.map((s, idx) => (_jsx("span", { style: { backgroundColor: 'rgba(0, 255, 200, 0.2)', padding: '0 6px', border: '1px solid #00ffc8', color: '#00ffc8' }, children: s }, idx)))] })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { color: '#00ffc8', fontWeight: 'bold', fontSize: '1.1rem' }, children: ">" }), _jsx("input", { ref: inputRef, type: "text", value: inputVal, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0430\u0434\u043C\u0438\u043D\u0430 (help, spawn, give, god, fog, kill, teleport, win, lose, ai, fps)...", style: {
                            flex: 1,
                            backgroundColor: 'rgba(0, 255, 200, 0.05)',
                            border: '1px solid #00ffc8',
                            color: '#ffffff',
                            padding: '8px 12px',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            outline: 'none'
                        } })] })] }));
};
//# sourceMappingURL=AdminConsole.js.map