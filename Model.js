function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Vertex(p, uv)
{
    this.triangles = [];
    this.p = p;
    this.uv = uv;
    this.normal = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

const scale = 0.6;
const pi = Math.PI;

const a = 1;
const teta = 0;
const r = 2;

// const a = 1;
// const teta = 0;
// const r = 1;

// const a = 1;
// const teta = 0.25 * pi;
// const r = 2;

// var COUNT_POINTS_U = 0;
// var COUNT_POINTS_V = 0;

// const U_SPACE = [0,pi];
// const V_SPACE = [0,2*pi];

const U_SPACE = [-pi,pi];
const V_SPACE = [0,2*pi];


function createTriangle(vertexList, triangleList, vertex, index_point_1, index_point_2){
    let count_points = vertexList.length;
    let count_triangles = triangleList.length;
    let t = new Triangle(count_points, index_point_1, index_point_2);
    vertexList[index_point_1].triangles.push(count_triangles);
    vertexList[index_point_2].triangles.push(count_triangles);
    vertex.triangles.push(count_triangles);
    triangleList.push(t);
}


function x(u){
    return a * Math.pow(Math.cos(u),3);
}

function z(u){
    return a * Math.pow(Math.sin(u),3);
}

function getVector(u, v){
    let vec_x = (r + x(u) * Math.cos(teta) - z(u) * Math.sin(teta)) * Math.cos(v);
    let vec_y = (r + x(u) * Math.cos(teta) - z(u) * Math.sin(teta)) * Math.sin(v);
    let vec_z = x(u) * Math.sin(teta) + z(u) * Math.cos(teta);

    // let vec_x = 3.0 * Math.sin(u) * Math.cos(v);
    // let vec_y = 3.0 * Math.sin(u) * Math.sin(v);
    // let vec_z = 3.0 * Math.cos(u);
    return [scale * vec_x, scale * vec_y, scale * vec_z]
}

function getPolylines(min, count, step){
    let list = [];
    for(let i=0; i<count; i++){
        list.push(min + i * step);
    }
    return list;
}

// Constructor
function Model(name, count_u, count_v) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.COUNT_POINTS_U = count_u;
    this.COUNT_POINTS_V = count_v;

    // Розрахунок STEP_U, STEP_V, u_polylines та v_polylines тільки якщо count_u та count_v не дорівнюють 0
    if (count_u > 0 && count_v > 0) {
        this.STEP_U = (U_SPACE[1] - U_SPACE[0]) / (this.COUNT_POINTS_U-1);
        this.STEP_V = (V_SPACE[1] - V_SPACE[0]) / (this.COUNT_POINTS_V-1);

        this.u_polylines = getPolylines(U_SPACE[0], this.COUNT_POINTS_U, this.STEP_U);
        this.v_polylines = getPolylines(V_SPACE[0], this.COUNT_POINTS_V, this.STEP_V);
    }


    this.BufferData = function() {
        let data = this.CreateSurfaceData(this.u_polylines, this.v_polylines);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.verticesF32, gl.STREAM_DRAW);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indicesU16, gl.STREAM_DRAW);

        this.count = data.indicesU16.length;
    }

    this.Draw = function() {

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.DrawWireframe = function() {
        gl.drawElements(gl.LINES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.buildPointTriangle = function(vertexList, triangleList, vertex, u_index, isLastRow)
    {
        let count_points = vertexList.length;
        if(u_index != this.COUNT_POINTS_U - 1){
            //  Prev Current          
            //    o   o          
            //    o   o                    
            //    2   o                    
            //    1   S                    
            index_point_1 = count_points - this.COUNT_POINTS_U;
            index_point_2 = count_points - this.COUNT_POINTS_U + 1;
            createTriangle(vertexList, triangleList, vertex, index_point_1, index_point_2);
        }

        if(u_index != 0){
            //  Prev Current
            //    o   o
            //    o   o
            //    1   S
            //    o   3
            index_point_1 = count_points - this.COUNT_POINTS_U;
            index_point_3 = count_points - 1;
            createTriangle(vertexList, triangleList, vertex, index_point_1, index_point_3);
        }
    }

    this.CreateSurfaceData = function(polylinesU, polylinesV)
    {
        let vertexList = [];
        let triangleList = [];

        for(let v_index=0; v_index<polylinesV.length; v_index++){
            for(let u_index=0; u_index<polylinesU.length; u_index++){
                let vertex = new Vertex(getVector(polylinesU[u_index], polylinesV[v_index]), [polylinesU[u_index], polylinesV[v_index]]);
                if(v_index != 0){
                    this.buildPointTriangle(vertexList, triangleList, vertex, u_index, false);
                }
                vertexList.push(vertex);
            }
        }

        this.calculateNormals(vertexList);

        verticesF32 = new Float32Array(vertexList.length*3);
        for (let i=0; i<vertexList.length; i++)
        {
            verticesF32[i*3 + 0] = vertexList[i].p[0];
            verticesF32[i*3 + 1] = vertexList[i].p[1];
            verticesF32[i*3 + 2] = vertexList[i].p[2];
        }

        indicesU16 = new Uint16Array(triangleList.length*3);
        for (let i=0; i<triangleList.length; i++)
        {
            indicesU16[i*3 + 0] = triangleList[i].v0;
            indicesU16[i*3 + 1] = triangleList[i].v1;
            indicesU16[i*3 + 2] = triangleList[i].v2;
        }

        return {verticesF32, indicesU16};
    }

    this.calculateNormals = function(vertexList){
        for (let i=0; i<vertexList.length; i++){
            let vertex = vertexList[i];
            let p0 = vertex.p;
            let p1 = getVector(vertex.uv[0] + this.STEP_U, vertex.uv[1]);
            let p2 = getVector(vertex.uv[0], vertex.uv[1] + this.STEP_V);
            let p3 = getVector(vertex.uv[0] - this.STEP_U, vertex.uv[1] + this.STEP_V);
            let p4 = getVector(vertex.uv[0] - this.STEP_U, vertex.uv[1]);
            let p5 = getVector(vertex.uv[0] - this.STEP_U, vertex.uv[1] - this.STEP_V);
            let p6 = getVector(vertex.uv[0], vertex.uv[1] - this.STEP_V);
            
            let v1 = m4.subtractVectors(p1, p0);
            let v2 = m4.subtractVectors(p2, p0);
            let v3 = m4.subtractVectors(p3, p0);
            let v4 = m4.subtractVectors(p4, p0);
            let v5 = m4.subtractVectors(p5, p0);
            let v6 = m4.subtractVectors(p6, p0);
            
            let n1 = m4.normalize(m4.cross(v1, v2));
            let n2 = m4.normalize(m4.cross(v2, v3));
            let n3 = m4.normalize(m4.cross(v3, v4));
            let n4 = m4.normalize(m4.cross(v4, v5));
            let n5 = m4.normalize(m4.cross(v5, v6));
            let n6 = m4.normalize(m4.cross(v6, v1));
            let n = [
                (n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
                (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
                (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0
            ];
            vertexList[i].normal = n;
        }
    }
}