// Функція для підключення до WebSocket
function connectToWebSocket() {
    // Підключаємось до фіксованої адреси WebSocket
    const serverAddress = 'ws://192.168.88.10:8080/sensor/connect?type=android.sensor.game_rotation_vector';
    
    // Створюємо простий індикатор статусу
    const statusDiv = document.createElement('div');
    statusDiv.style.position = 'absolute';
    statusDiv.style.top = '70px';
    statusDiv.style.left = '10px';
    statusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    statusDiv.style.padding = '10px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.color = 'white';
    statusDiv.textContent = 'Статус: підключення...';
    document.body.appendChild(statusDiv);
    console.log('Підключення до', serverAddress);
    
    // Створюємо з'єднання WebSocket
    try {
        const socket = new WebSocket(serverAddress);
        
        socket.onopen = () => {
            console.log('Підключено до Sensor Server');
            
            // Надсилаємо запити на дані сенсорів
            socket.send(JSON.stringify({ type: 'subscribe', sensors: ['ROTATION_VECTOR'] }));
            setTimeout(() => {
                socket.send(JSON.stringify({ command: 'START_LISTENING', sensors: ['ROTATION_VECTOR'], delay: 20 }));
            }, 500);
            statusDiv.textContent = 'Статус: підключено';
        };

        socket.onmessage = (e) => {
            try {
                // Отримуємо дані з події
                const messageData = e && e.data ? e.data : null;
                if (!messageData) {
                    console.log('Отримано порожні дані від Sensor Server');
                    return;
                }
                
                console.log('Отримано дані від Sensor Server:', messageData);
                
                // Обробляємо JSON дані
                let data;
                try {
                    data = JSON.parse(messageData); // {"values":[-0.0017297476,0.013697676,0.0012720661,0.99990386],"timestamp":331100012810835,"accuracy":3}
                    
                    // Перевіряємо наявність масиву values у даних
                    if (data.values && Array.isArray(data.values) && data.values.length >= 3) {
                        const values = data.values;
                        console.log('Отримано дані вектора обертання:', values);
                        
                        // Передаємо значення у форматі вектора обертання
                        const rotVec = [
                            values[0], // x
                            values[1], // y
                            values[2], // z
                            values.length >= 4 ? values[3] : 0 // w (якщо є)
                        ];
                        
                        getRotationMatrixFromVector(rotationMatrix, rotVec);
                    }
                } catch (parseError) {
                    console.log('Отримано текстове повідомлення:', messageData);
                    return;
                }
            } catch (error) {
                console.error('Помилка обробки даних WebSocket:', error);
            }
            };
    
            socket.onclose = (e) => {
                // Безпечне отримання коду помилки
                const code = e && e.code ? e.code : 'невідомий';
                console.log('Відключено від Sensor Server', code);
                statusDiv.textContent = 'Статус: відключено';
                statusDiv.style.color = 'red';
                
                // Додаткова інформація щодо коду закриття
                let reasonText = '';
                switch(code) {
                    case 1000: reasonText = 'Нормальне закриття'; break;
                    case 1001: reasonText = 'Сторона пішла'; break;
                    case 1002: reasonText = 'Помилка протоколу'; break;
                    case 1003: reasonText = 'Непідтримуваний тип даних'; break;
                    case 1005: reasonText = 'Немає статусного коду'; break;
                    case 1006: reasonText = 'Аномальне закриття (можливо, сервер недоступний)'; break;
                    case 1007: reasonText = 'Невалідні дані'; break;
                    case 1008: reasonText = 'Порушення політики'; break;
                    case 1009: reasonText = 'Повідомлення занадто велике'; break;
                    case 1010: reasonText = 'Обов\'язкове розширення відсутнє'; break;
                    case 1011: reasonText = 'Несподівана помилка'; break;
                    case 1012: reasonText = 'Перезапуск сервера'; break;
                    case 1013: reasonText = 'Спробуйте пізніше (сервер перевантажений)'; break;
                    case 1015: reasonText = 'Збій TLS'; break;
                    case 4002: reasonText = 'Помилка авторизації. Невірний токен.'; break;
                    default: reasonText = 'Невідомий код помилки';
                }
                console.log('Причина закриття:', reasonText);
        };
            
        socket.onerror = (e) => {
            console.error('Помилка WebSocket:', e);
            statusDiv.textContent = 'Статус: помилка підключення';
            statusDiv.style.color = 'red';
        };
    } catch (error) {
        console.error('Помилка підключення:', error);
        statusDiv.textContent = 'Статус: невірна адреса';
        statusDiv.style.color = 'red';
    }
};