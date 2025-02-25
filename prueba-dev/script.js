document.addEventListener("DOMContentLoaded", () => {
    const urlDiccionario = "https://api.dictionaryapi.dev/api/v2/entries/en/";
    const urlPixabay = "https://pixabay.com/api/?key=48923565-50546a36b044ec403802ea0fc&q=";

    const resultado = document.getElementById("resultado");
    const botonBuscar = document.getElementById("buscar-btn");
    const botonMicrofono = document.getElementById("microfono-btn");
    const listaHistorial = document.getElementById("lista-historial");
    const botonToggleHistorial = document.getElementById("toggle-historial-btn");
    const botonCerrarHistorial = document.getElementById("cerrar-historial-btn");
    const contenedorHistorial = document.getElementById("contenedor-historial");
    const botonToggleTraducir = document.getElementById("toggle-traducir-btn");
    const botonAsistente = document.getElementById("asistente-btn");
    const botonAsistenteMobile = document.getElementById("asistente-btn-mobile");
    const searchContainer = document.getElementById("search-container");
    const botonVerMas = document.getElementById("ver-mas-btn");
    const galeria = document.getElementById("galeria");
    const menuIcon = document.getElementById("menu-icon");
    const sidePanel = document.getElementById("side-panel");
    const toggleHistorialBtnMobile = document.getElementById("toggle-historial-btn-mobile");
    const toggleTraducirBtnMobile = document.getElementById("toggle-traducir-btn-mobile");
    const footer = document.getElementById("footer");

    const MAX_HISTORIAL_ITEMS = 20;
    let idiomaActual = "en";
    let imagenesCargadas = [];
    let recognition;
    let asistenteActivo = false;
    let speechSynthesisUtterance;

    botonBuscar.addEventListener("click", () => {
        buscarPalabra();
    });

    document.getElementById("entrada-palabra").addEventListener("keydown", function(evento) {
        if (evento.key === "Enter") {
            evento.preventDefault();
            buscarPalabra();
        }
    });

    botonMicrofono.addEventListener("click", iniciarDictado);

    botonToggleHistorial.addEventListener("click", () => {
        contenedorHistorial.classList.toggle("mostrar");
        if (contenedorHistorial.classList.contains("mostrar")) {
            cargarHistorial();
        }
    });

    botonCerrarHistorial.addEventListener("click", () => {
        contenedorHistorial.classList.remove("mostrar");
    });

    botonToggleTraducir.addEventListener("click", traducirPagina);

    toggleHistorialBtnMobile.addEventListener("click", () => {
        contenedorHistorial.classList.toggle("mostrar");
        sidePanel.classList.remove("show");
        if (contenedorHistorial.classList.contains("mostrar")) {
            cargarHistorial();
        }
    });

    toggleTraducirBtnMobile.addEventListener("click", () => {
        traducirPagina();
        sidePanel.classList.remove("show");
    });

    menuIcon.addEventListener("click", () => {
        sidePanel.classList.toggle("show");
    });

    botonVerMas.addEventListener("click", () => {
        toggleGaleria();
    });

    botonAsistente.addEventListener("click", () => {
        activarAsistente();
    });

    botonAsistenteMobile.addEventListener("click", () => {
        activarAsistente();
        sidePanel.classList.remove("show");
    });

    function buscarPalabra() {
        let entradaPalabra = document.getElementById("entrada-palabra").value;

        // Move search bar to the top left corner
        searchContainer.classList.add("move-to-top");

        fetch(`${urlDiccionario}${entradaPalabra}`)
            .then((respuesta) => respuesta.json())
            .then((datos) => {
                if (datos.title && datos.title === "No Definitions Found") {
                    throw new Error("No definitions found");
                }

                const datosPalabra = datos[0];
                const sinonimos = datosPalabra.meanings[0].definitions[0].synonyms || [];
                const textoSinonimos = sinonimos.length > 0 ? sinonimos.join(", ") : "No synonyms available";
                const ejemplo = datosPalabra.meanings[0].definitions[0].example || "No example available";

                document.getElementById("nombre-palabra").textContent = entradaPalabra;
                document.getElementById("texto-sinonimos").textContent = textoSinonimos;
                document.getElementById("significado-palabra").textContent = datosPalabra.meanings[0].definitions[0].definition;
                document.getElementById("ejemplo-palabra").textContent = ejemplo;

                document.querySelector(".palabra").style.display = "flex";
                document.querySelector(".sinonimos").style.display = "block";
                document.querySelector(".definicion").style.display = "block";
                document.querySelector(".ejemplo").style.display = "block";

                fetch(`${urlPixabay}${entradaPalabra}&image_type=photo&pretty=true`)
                    .then((respuesta) => respuesta.json())
                    .then((datosImagen) => {
                        const seccionDerecha = document.getElementById("seccion-derecha");
                        seccionDerecha.innerHTML = "";
                        imagenesCargadas = datosImagen.hits;
                        datosImagen.hits.slice(0, 2).forEach((imagen) => {  // Only show 2 images
                            const imgElement = document.createElement("img");
                            imgElement.src = imagen.webformatURL;
                            imgElement.alt = entradaPalabra;
                            seccionDerecha.appendChild(imgElement);
                        });
                        if (datosImagen.hits.length > 2) {
                            botonVerMas.style.display = "block";
                        }
                    })
                    .catch(() => {
                        document.getElementById("seccion-derecha").innerHTML = "";
                    });

                guardarTerminoBusqueda(entradaPalabra);

                // Show the results block
                resultado.classList.add("mostrar");

                // Read the results aloud if the assistant is active
                if (asistenteActivo) {
                    const textoResultado = `Word: ${entradaPalabra}. Definition: ${datosPalabra.meanings[0].definitions[0].definition}. Synonyms: ${textoSinonimos}. Example: ${ejemplo}.`;
                    leerEnVozAlta(textoResultado);
                }
            })
            .then(() => {
                if (idiomaActual === "es") {
                    traducirResultado();
                }
            })
            .catch((error) => {
                resultado.innerHTML = `<h3 class="error">${error.message}</h3>`;
                setTimeout(() => {
                    location.reload();
                }, 1000);
            });
    }

    function guardarTerminoBusqueda(palabra) {
        let historial = JSON.parse(localStorage.getItem("historialBusqueda")) || [];
        historial.unshift({ palabra: palabra, timestamp: new Date().toLocaleString() });

        if (historial.length > MAX_HISTORIAL_ITEMS) {
            historial = historial.slice(0, MAX_HISTORIAL_ITEMS);
        }

        localStorage.setItem("historialBusqueda", JSON.stringify(historial));
        cargarHistorial();
    }

    function cargarHistorial() {
        let historial = JSON.parse(localStorage.getItem("historialBusqueda")) || [];
        listaHistorial.innerHTML = '';
        historial.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${item.palabra} - ${item.timestamp} <button onclick="eliminarItemHistorial(${index})"><i class="fas fa-trash"></i></button>`;
            listaHistorial.appendChild(li);
        });
        traducirHistorial();
    }

    window.eliminarItemHistorial = function(index) {
        let historial = JSON.parse(localStorage.getItem("historialBusqueda")) || [];
        if (index >= 0 && index < historial.length) {
            historial.splice(index, 1);
            localStorage.setItem("historialBusqueda", JSON.stringify(historial));
            cargarHistorial();
        }
    }

    function traducirPagina() {
        idiomaActual = idiomaActual === "en" ? "es" : "en";
        const body = document.body;
        body.setAttribute("lang", idiomaActual);
        document.documentElement.lang = idiomaActual;

        const textosATraducir = {
            en: {
                "toggle-historial-btn": "History",
                "toggle-traducir-btn": "Translate",
                "entrada-palabra": "Type the word here...",
                "buscar-btn": "Search",
                "sinonimos": "Synonyms",
                "definicion": "Definition",
                "ejemplo": "Example",
                "imagen": "Image",
                "cerrar-historial-btn": "Close",
                "history-title": "Search History",
                "logo": "WEB DICTIONARY",
                "ver-mas-btn": botonVerMas.textContent === "Ver menos" ? "See Less" : "See More",
                "asistente-btn": "Assistant",
                "asistente-btn-mobile": "Assistant"
            },
            es: {
                "toggle-historial-btn": "Historial",
                "toggle-traducir-btn": "Traducir",
                "entrada-palabra": "Escribe la palabra aquí...",
                "buscar-btn": "Buscar",
                "sinonimos": "Sinónimos",
                "definicion": "Definición",
                "ejemplo": "Ejemplo",
                "imagen": "Imagen",
                "cerrar-historial-btn": "Cerrar",
                "history-title": "Historial de Búsqueda",
                "logo": "WEB DICCIONARIO",
                "ver-mas-btn": botonVerMas.textContent === "See Less" ? "Ver menos" : "Ver más",
                "asistente-btn": "Asistente",
                "asistente-btn-mobile": "Asistente"
            }
        };

        const traduccion = textosATraducir[idiomaActual];

        document.getElementById("toggle-historial-btn").textContent = traduccion["toggle-historial-btn"];
        document.getElementById("toggle-traducir-btn").textContent = traduccion["toggle-traducir-btn"];
        document.getElementById("entrada-palabra").setAttribute("placeholder", traduccion["entrada-palabra"]);
        document.getElementById("buscar-btn").textContent = traduccion["buscar-btn"];
        document.getElementById("cerrar-historial-btn").textContent = traduccion["cerrar-historial-btn"];
        document.querySelector(".historial h2").textContent = traduccion["history-title"];
        document.querySelector(".logo").textContent = traduccion["logo"];
        document.getElementById("ver-mas-btn").textContent = traduccion["ver-mas-btn"];
        document.getElementById("asistente-btn").textContent = traduccion["asistente-btn"];
        document.getElementById("asistente-btn-mobile").textContent = traduccion["asistente-btn-mobile"];

        traducirResultado();
        traducirHistorial();
    }

    function traducirResultado() {
        const nombrePalabra = document.getElementById("nombre-palabra");
        const significadoPalabra = document.querySelector(".significado-palabra");
        const textoSinonimos = document.getElementById("texto-sinonimos");
        const ejemploPalabra = document.getElementById("ejemplo-palabra");

        if (nombrePalabra) {
            traducirTexto(nombrePalabra.textContent, idiomaActual).then(textoTraducido => {
                nombrePalabra.textContent = textoTraducido;
            });
        }

        if (significadoPalabra) {
            traducirTexto(significadoPalabra.textContent, idiomaActual).then(textoTraducido => {
                significadoPalabra.textContent = textoTraducido;
            });
        }

        if (textoSinonimos) {
            traducirTexto(textoSinonimos.textContent, idiomaActual).then(textoTraducido => {
                textoSinonimos.textContent = textoTraducido;
            });
        }

        if (ejemploPalabra) {
            traducirTexto(ejemploPalabra.textContent, idiomaActual).then(textoTraducido => {
                ejemploPalabra.textContent = textoTraducido;
            });
        }
    }

    function traducirHistorial() {
        const itemsHistorial = listaHistorial.querySelectorAll('li');
        itemsHistorial.forEach((item, index) => {
            const palabra = item.childNodes[0].textContent.split(' - ')[0];
            const fecha = item.childNodes[0].textContent.split(' - ')[1];
            traducirTexto(palabra, idiomaActual).then(palabraTraducida => {
                item.innerHTML = `${palabraTraducida} - ${fecha} <button onclick="eliminarItemHistorial(${index})"><i class="fas fa-trash"></i></button>`;
            });
        });
    }

    function traducirTexto(texto, idiomaDestino) {
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idiomaDestino}&dt=t&q=${encodeURI(texto)}`;
        return fetch(apiUrl)
            .then(response => response.json())
            .then(data => data[0][0][0])
            .catch(() => texto);
    }

    function iniciarDictado() {
        if (window.hasOwnProperty('webkitSpeechRecognition')) {
            const reconocimiento = new webkitSpeechRecognition();
            reconocimiento.continuous = false;
            reconocimiento.interimResults = false;
            reconocimiento.lang = "es-ES";
            reconocimiento.start();

            botonMicrofono.classList.add("active");

            reconocimiento.onresult = function(event) {
                document.getElementById('entrada-palabra').value = event.results[0][0].transcript;
                reconocimiento.stop();
                botonMicrofono.classList.remove("active");
                buscarPalabra();
            };

            reconocimiento.onerror = function(event) {
                reconocimiento.stop();
                botonMicrofono.classList.remove("active");
            };
        }
    }

    function mostrarGaleria() {
        if (galeria.style.display === "block") {
            galeria.style.display = "none";
            botonVerMas.textContent = idiomaActual === "en" ? "See More" : "Ver más";
            document.body.classList.remove("ver-mas-activo");
            footer.classList.remove("mostrar");
        } else {
            galeria.style.display = "block";
            botonVerMas.textContent = idiomaActual === "en" ? "See Less" : "Ver menos";
            document.body.classList.add("ver-mas-activo");
            mostrarGaleria();
            footer.classList.add("mostrar");
        }
    }

    function toggleGaleria() {
        const galeriaVisible = galeria.style.display === "block";
        
        if (galeriaVisible) {
            galeria.style.display = "none";
            botonVerMas.textContent = idiomaActual === "en" ? "See More" : "Ver más";
            footer.classList.remove("mostrar");
        } else {
            galeria.style.display = "block";
            botonVerMas.textContent = idiomaActual === "en" ? "See Less" : "Ver menos";
            mostrarGaleria();
            footer.classList.add("mostrar");
        }
        
        document.body.classList.toggle("ver-mas-activo", !galeriaVisible);
    }

    function parseNumber(text, lang) {
        // Intenta parsear como número directamente
        const numeral = parseInt(text);
        if (!isNaN(numeral)) return numeral;
    
        // Mapeo de números en palabras
        const numberWords = {
            en: {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
                'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
            },
            es: {
                'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
                'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
                'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
                'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20
            }
        };
        
        return numberWords[lang][text] || NaN;
    }

    function activarAsistente() {
        const asistenteLi = document.getElementById("asistente-btn");
        const asistenteLiMobile = document.getElementById("asistente-btn-mobile");

        if (asistenteActivo) {
            recognition.stop();
            window.speechSynthesis.cancel();
            asistenteActivo = false;
            asistenteLi.classList.remove("asistente-activo");
            asistenteLiMobile.classList.remove("asistente-activo");
            leerEnVozAlta(idiomaActual === "en" ? "Voice assistant deactivated." : "Asistente de voz desactivado.");
        } else {
            if (window.hasOwnProperty('webkitSpeechRecognition')) {
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.lang = idiomaActual === "en" ? "en-US" : "es-ES";
                recognition.start();

                recognition.onresult = function(event) {

// ... resto del código ...

                    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
                    if (transcript === "desactivar" || transcript === "desactívate") {
                        recognition.stop();
                        window.speechSynthesis.cancel();
                        asistenteActivo = false;
                        asistenteLi.classList.remove("asistente-activo");
                        asistenteLiMobile.classList.remove("asistente-activo");
                        leerEnVozAlta(idiomaActual === "en" ? "Voice assistant deactivated." : "Asistente de voz desactivado.");
                    } else if (transcript.startsWith("search") || transcript.startsWith("buscar")) {
                        const palabra = transcript.replace(idiomaActual === "en" ? "search" : "buscar", "").trim();
                        document.getElementById('entrada-palabra').value = palabra;
                        buscarPalabra();
                    } else if (transcript === "read me" || transcript === "léeme" || transcript === "leeme") {
                        leerEnVozAlta(document.getElementById("significado-palabra").textContent);
                    } else if (transcript === "abre el historial" || transcript === "open history") {
                        contenedorHistorial.classList.add("mostrar");
                        cargarHistorial();
                    } else if (transcript === "cierra el historial" || transcript === "close history") {
                        contenedorHistorial.classList.remove("mostrar");
                        
                    }else if (transcript.startsWith("elimina la búsqueda número") || transcript.startsWith("delete the search number")) {
                        const numeroTexto = transcript.replace(idiomaActual === "en" ? /delete the search number/gi : /elimina la búsqueda número/gi, "").trim().toLowerCase();
                        const numero = parseNumber(numeroTexto, idiomaActual);
                        
                        if (!isNaN(numero)) {
                            const index = numero - 1;
                            if (index >= 0) {
                                eliminarItemHistorial(index);
                                leerEnVozAlta(idiomaActual === "en" ? `Search number ${numero} deleted` : `Búsqueda número ${numero} eliminada`);
                            }
                        } else {
                            leerEnVozAlta(idiomaActual === "en" ? "Invalid number" : "Número inválido");
                        }
                    
                    }
                    // ... otros else if anteriores ...

                    else if (
                    (idiomaActual === "en" && (transcript.includes("show gallery") || transcript.includes("hide gallery"))) || 
                    (idiomaActual === "es" && (transcript.includes("ver galería") || transcript.includes("esconder galería")))
                ) {
                    toggleGaleria();
                    const galeriaVisible = galeria.style.display === "block";
    
                    let mensaje;
                    if (idiomaActual === "en") {
                    mensaje = galeriaVisible ? "Gallery is now visible" : "Gallery hidden";
    } else {
        mensaje = galeriaVisible ? "Galería visible" : "Galería oculta";
    }
    
    leerEnVozAlta(mensaje);
}

// ... resto del código ...
                };

                recognition.onerror = function(event) {
                    recognition.stop();
                    asistenteActivo = false;
                    asistenteLi.classList.remove("asistente-activo");
                    asistenteLiMobile.classList.remove("asistente-activo");
                    leerEnVozAlta(idiomaActual === "en" ? "Voice recognition error." : "Error en el reconocimiento de voz.");
                };

                asistenteActivo = true;
                asistenteLi.classList.add("asistente-activo");
                asistenteLiMobile.classList.add("asistente-activo");
                leerEnVozAlta(idiomaActual === "en" ? "Hello, I'm your voice assistant. To search for a word, say 'search' and the word you want to search for. To deactivate me, you can do it manually or say 'deactivate'. If you want me to read a searched word, say 'read me'." : "Hola, soy su asistente de voz. Para buscar una palabra, diga 'buscar' y la palabra que desea buscar. Para desactivarme, puede hacerlo manualmente o diciendo 'desactivar'.");
            }
            else {
                leerEnVozAlta(idiomaActual === "en" ? "Voice recognition is not supported in this browser." : "El reconocimiento de voz no es compatible con este navegador.");
            }
        }
    }

    function leerEnVozAlta(texto) {
        const speech = new SpeechSynthesisUtterance(texto);
        speech.lang = idiomaActual === "en" ? "en-US" : "es-ES";
        window.speechSynthesis.speak(speech);
    }

    const letters = "JRM";
    const backgroundLetters = document.getElementById("background-letters");

    function createLetter() {
        const letter = document.createElement("span");
        letter.classList.add("letter");
        letter.textContent = letters[Math.floor(Math.random() * letters.length)];
        letter.style.left = `${Math.random() * 100}vw`;
        letter.style.animationDuration = `${Math.random() * 5 + 5}s`;
        backgroundLetters.appendChild(letter);

        setTimeout(() => {
            letter.remove();
        }, 10000);
    }

    setInterval(createLetter, 300);

    // Prevent storing search suggestions
    document.getElementById("entrada-palabra").addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
        }
    });
});