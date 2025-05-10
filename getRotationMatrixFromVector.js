/**
 * Функція для перетворення вектора обертання в матрицю обертання.
 * На основі вектора обертання (ймовірно, з сенсора ROTATION_VECTOR), повертає
 * 9 або 16-елементну матрицю обертання в масиві R. R повинен мати довжину 9 або 16.
 * 
 * Якщо R.length == 9, повертається наступна матриця:
 * /  R[0]   R[1]   R[2]   \
 * |  R[3]   R[4]   R[5]   |
 * \  R[6]   R[7]   R[8]   /
 *
 * Якщо R.length == 16, повертається наступна матриця:
 * /  R[0]    R[1]    R[2]    0  \
 * |  R[4]    R[5]    R[6]    0  |
 * |  R[8]    R[9]    R[10]   0  |
 * \  0       0       0       1  /
 * 
 * @param {Float32Array|Array} R - масив для зберігання матриці обертання (довжини 9 або 16)
 * @param {Float32Array|Array} rotationVector - вектор обертання для перетворення
 */
function getRotationMatrixFromVector(R, rotationVector) {
    let q0;
    const q1 = rotationVector[0];
    const q2 = rotationVector[1];
    const q3 = rotationVector[2];
    
    // Визначення четвертого компонента кватерніона
    if (rotationVector.length >= 4) {
        q0 = rotationVector[3];
    } else {
        q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
        q0 = (q0 > 0) ? Math.sqrt(q0) : 0;
    }
    
    // Попередні обчислення для оптимізації
    const sq_q1 = 2 * q1 * q1;
    const sq_q2 = 2 * q2 * q2;
    const sq_q3 = 2 * q3 * q3;
    const q1_q2 = 2 * q1 * q2;
    const q3_q0 = 2 * q3 * q0;
    const q1_q3 = 2 * q1 * q3;
    const q2_q0 = 2 * q2 * q0;
    const q2_q3 = 2 * q2 * q3;
    const q1_q0 = 2 * q1 * q0;
    
    // Заповнення матриці відповідно до розміру вихідного масиву
    if (R.length === 9) {
        R[0] = 1 - sq_q2 - sq_q3;
        R[1] = q1_q2 - q3_q0;
        R[2] = q1_q3 + q2_q0;
        R[3] = q1_q2 + q3_q0;
        R[4] = 1 - sq_q1 - sq_q3;
        R[5] = q2_q3 - q1_q0;
        R[6] = q1_q3 - q2_q0;
        R[7] = q2_q3 + q1_q0;
        R[8] = 1 - sq_q1 - sq_q2;
    } else if (R.length === 16) {
        R[0] = 1 - sq_q2 - sq_q3;
        R[1] = q1_q2 - q3_q0;
        R[2] = q1_q3 + q2_q0;
        R[3] = 0.0;
        R[4] = q1_q2 + q3_q0;
        R[5] = 1 - sq_q1 - sq_q3;
        R[6] = q2_q3 - q1_q0;
        R[7] = 0.0;
        R[8] = q1_q3 - q2_q0;
        R[9] = q2_q3 + q1_q0;
        R[10] = 1 - sq_q1 - sq_q2;
        R[11] = 0.0;
        R[12] = 0.0;
        R[13] = 0.0;
        R[14] = 0.0;
        R[15] = 1.0;
    }
}