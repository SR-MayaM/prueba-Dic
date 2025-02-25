document.addEventListener('DOMContentLoaded', function () {
    // Elementos del DOM
    const searchContainer = document.getElementById('search-container');
    const buscarBtn = document.getElementById('buscar-btn');
    const entradaPalabra = document.getElementById('entrada-palabra');
    const resultado = document.getElementById('resultado');
    const nombrePalabra = document.getElementById('nombre-palabra');
    const significadoPalabra = document.getElementById('significado-palabra');
    const sinonimosPalabra = document.getElementById('sinonimos-palabra');
    const ejemploPalabra = document.getElementById('ejemplo-palabra');
    const seccionDerecha = document.getElementById('seccion-derecha');
    const verMasBtn = document.getElementById('ver-mas-btn');
    const galeria = document.getElementById('galeria');
    const galeriaImagenes = document.getElementById('galeria-imagenes');
    const footer = document.getElementById('footer');
    const toggleHistorialBtn = document.getElementById('toggle-historial-btn');
    const cerrarHistorialBtn = document.getElementById('cerrar-historial-btn');
    const contenedorHistorial = document.getElementById('contenedor-historial');
    const listaHistorial = document.getElementById('lista-historial');
    const toggleTraducirBtn = document.getElementById('toggle-traducir-btn');
    const mensajeError = document.getElementById('mensaje-error');
    const mensajeTexto = document.getElementById('mensaje-texto');

    // Variables
    let historial = JSON.parse(localStorage.getItem('historial')) || [];
    const urlDiccionario = "https://api.dictionaryapi.dev/api/v2/entries/en/";
    const urlPixabay = "https://pixabay.com/api/?key=48923565-50546a36b044ec403802ea0fc&q=";
    const urlGoogleTranslate = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=";
    let traduccionActual = 'en';
    let imagenesCargadas = [];

    // Funciones
    function guardarEnHistorial(palabra) {
        historial.push(palabra);
        localStorage.setItem('historial', JSON.stringify(historial));
        renderizarHistorial();
    }

    function renderizarHistorial() {
        listaHistorial.innerHTML = '';
        historial.forEach((palabra, index) => {
            const li = document.createElement('li');
            li.textContent = palabra;
            const botonEliminar = document.createElement('button');
            botonEliminar.innerHTML = '<i class="fas fa-trash-alt"></i>';
            botonEliminar.addEventListener('click', () => {
                eliminarDelHistorial(index);
            });
            li.appendChild(botonEliminar);
            listaHistorial.appendChild(li);
        });
    }

    function eliminarDelHistorial(index) {
        historial.splice(index, 1);
        localStorage.setItem('historial', JSON.stringify(historial));
        renderizarHistorial();
    }

    async function buscarPalabra(palabra) {
        try {
            const response = await fetch(urlDiccionario + palabra);
            const data = await response.json();
            if (data.title === "No Definitions Found") {
                mostrarMensajeError('Tu palabra no se encuentra');
                return;
            }
            const resultadoAPI = {
                nombre: data[0].word,
                significado: data[0].meanings[0].definitions[0].definition,
                sinonimos: data[0].meanings[0].definitions[0].synonyms || [],
                ejemplo: data[0].meanings[0].definitions[0].example || "No example available.",
                imagenes: await buscarImagenes(palabra)
            };
            mostrarResultado(resultadoAPI);
            guardarEnHistorial(palabra);
        } catch (error) {
            console.error('Error al buscar la palabra:', error);
            mostrarMensajeError('Error al buscar la palabra');
        }
    }

    async function buscarImagenes(palabra) {
        try {
            const response = await fetch(`${urlPixabay}${palabra}&image_type=photo&pretty=true`);
            const datosImagen = await response.json();
            imagenesCargadas = datosImagen.hits;
            return imagenesCargadas.map(imagen => imagen.webformatURL);
        } catch (error) {
            console.error('Error al buscar las imágenes:', error);
            return [];
        }
    }

    function mostrarResultado(resultadoAPI) {
        nombrePalabra.textContent = resultadoAPI.nombre;
        significadoPalabra.textContent = resultadoAPI.significado;
        sinonimosPalabra.textContent = resultadoAPI.sinonimos.join(', ');
        ejemploPalabra.textContent = resultadoAPI.ejemplo;

        seccionDerecha.innerHTML = "";
        resultadoAPI.imagenes.slice(0, 2).forEach((imagen) => {  // Mostrar solo 2 imágenes
            const imgElement = document.createElement("img");
            imgElement.src = imagen;
            imgElement.alt = resultadoAPI.nombre;
            seccionDerecha.appendChild(imgElement);
        });

        resultado.style.display = 'flex';
        verMasBtn.style.display = 'block';
        mensajeError.style.display = 'none';
    }

    function mostrarMensajeError(mensaje) {
        mensajeTexto.textContent = mensaje;
        mensajeError.style.display = 'block';
        resultado.style.display = 'none';
        verMasBtn.style.display = 'none';
        galeria.style.display = 'none';
        document.body.classList.remove('ver-mas-activo');
    }

    function traducirPagina() {
        const elementos = document.querySelectorAll('.definicion, .sinonimos, .ejemplo, .resultado h2');
        elementos.forEach(async (elemento) => {
            if (elemento.children.length === 0 && elemento.textContent.trim() !== '') {
                try {
                    const response = await fetch(`${urlGoogleTranslate}${encodeURIComponent(elemento.textContent)}`);
                    const data = await response.json();
                    elemento.textContent = data[0][0][0];
                } catch (error) {
                    console.error('Error al traducir:', error);
                }
            }
        });
    }

    // Eventos
    buscarBtn.addEventListener('click', () => {
        const palabra = entradaPalabra.value.trim();
        if (palabra) {
            buscarPalabra(palabra);
        } else {
            mostrarMensajeError('Escribe la palabra que quieras buscar');
        }
    });

    entradaPalabra.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarBtn.click();
        }
    });

    verMasBtn.addEventListener('click', () => {
        if (galeria.style.display === 'block') {
            galeria.style.display = 'none';
            verMasBtn.textContent = 'See More';
            footer.classList.remove('mostrar');
            document.body.classList.remove('ver-mas-activo');
        } else {
            galeria.style.display = 'block';
            verMasBtn.textContent = 'See Less';
            footer.classList.add('mostrar');
            document.body.classList.add('ver-mas-activo');
            // Llenar la galería con imágenes adicionales
            const palabra = entradaPalabra.value.trim();
            buscarImagenes(palabra).then(imagenes => {
                galeriaImagenes.innerHTML = '';
                imagenes.forEach((url) => {
                    const img = document.createElement('img');
                    img.src = url;
                    galeriaImagenes.appendChild(img);
                });
            });
        }
    });

    toggleHistorialBtn.addEventListener('click', () => {
        contenedorHistorial.classList.toggle('mostrar');
    });

    cerrarHistorialBtn.addEventListener('click', () => {
        contenedorHistorial.classList.remove('mostrar');
    });

    toggleTraducirBtn.addEventListener('click', () => {
        traducirPagina();
    });

    renderizarHistorial();
});