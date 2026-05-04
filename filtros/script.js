// 1. Base de datos de ejemplo (Agrega o quita proyectos aquí)
const datos = [
    { nombre: "Torres del Norte", compania: "Empresa A", desarrollo: "Residencial", ubicacion: "Norte" },
    { nombre: "Centro Industrial X", compania: "Empresa B", desarrollo: "Industrial", ubicacion: "Sur" },
    { nombre: "Plaza Comercial Sur", compania: "Empresa A", desarrollo: "Comercial", ubicacion: "Sur" },
    { nombre: "Residencial Centro", compania: "Empresa C", desarrollo: "Residencial", ubicacion: "Centro" },
    { nombre: "Bodegas Alfa", compania: "Empresa B", desarrollo: "Industrial", ubicacion: "Norte" }
];

// 2. Referencias a los elementos del HTML
const selectCompania = document.getElementById('filtro-compania');
const selectDesarrollo = document.getElementById('filtro-desarrollo');
const selectUbicacion = document.getElementById('filtro-ubicacion');
const contenedor = document.getElementById('contenedor-resultados');

// 3. Función principal de filtrado
function filtrar() {
    const vComp = selectCompania.value;
    const vDesa = selectDesarrollo.value;
    const vUbic = selectUbicacion.value;

    // Filtrar los datos
    const filtrados = datos.filter(item => {
        return (vComp === "" || item.compania === vComp) &&
               (vDesa === "" || item.desarrollo === vDesa) &&
               (vUbic === "" || item.ubicacion === vUbic);
    });

    // Limpiar y Dibujar resultados
    contenedor.innerHTML = "";
    
    if (filtrados.length === 0) {
        contenedor.innerHTML = "<p>No hay resultados para estos filtros.</p>";
        return;
    }

    filtrados.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tarjeta-resultado';
        card.innerHTML = `
            <h4>${item.nombre}</h4>
            <p><strong>Compañía:</strong> ${item.compania}</p>
            <p><strong>Tipo:</strong> ${item.desarrollo}</p>
            <p><strong>Zona:</strong> ${item.ubicacion}</p>
        `;
        contenedor.appendChild(card);
    });
}

// 4. Escuchar los cambios en los selectores
selectCompania.addEventListener('change', filtrar);
selectDesarrollo.addEventListener('change', filtrar);
selectUbicacion.addEventListener('change', filtrar);

// 5. Ejecutar una vez al cargar para mostrar todo al inicio
filtrar();