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

    const MAX_HISTORIAL_ITEMS = 10;
    let idiomaActual = "en";
    let imagenesCargadas = [];
    let recognition;
    let asistenteActivo = false;
    let presentacionActiva = false;

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

    let toques = 0;
    document.body.addEventListener("touchstart", () => {
        toques++;
        if (toques === 3) {
            activarAsistente();
            toques = 0;
        }
        setTimeout(() => {
            toques = 0;
        }, 1000);
    });

    function buscarPalabra() {
        let entradaPalabra = document.getElementById("entrada-palabra").value;
        searchContainer.classList.add("move-to-top");

        fetch(`${urlDiccionario}${entradaPalabra}`)
            .then((respuesta) => respuesta.json())
            .then((datos) => {
                if (datos.title && datos.title === "No Definitions Found") {
                    throw new Error("No se pudo encontrar la palabra");
                }

                const datosPalabra = datos[0];
                const sinonimos = datosPalabra.meanings[0].definitions[0].synonyms || [];
                const textoSinonimos = sinonimos.length > 0 ? sinonimos.join(", ") : "No hay sinónimos disponibles";
                const ejemplo = datosPalabra.meanings[0].definitions[0].example || "No hay ejemplo disponible";

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
                        datosImagen.hits.slice(0, 2).forEach((imagen) => { // Mostrar solo 2 imágenes
                            const imgElement = document.createElement("img");
                            imgElement.src = imagen.webformatURL;
                            imgElement.alt = entradaPalabra;
                            seccionDerecha.appendChild(imgElement);
                        });
                        if (datosImagen.hits.length > 2) {
                            botonVerMas.style.display = "block";
                        } else {
                            botonVerMas.style.display = "none";
                        }
                        ajustarScrollPagina();
                    })
                    .catch(() => {
                        document.getElementById("seccion-derecha").innerHTML = "";
                        botonVerMas.style.display = "none"; // Ocultar "Explore More" si hay un error
                        ajustarScrollPagina();
                    });

                guardarTerminoBusqueda(entradaPalabra);
                resultado.classList.add("mostrar");

                if (asistenteActivo) {
                    const textoResultado = `Palabra: ${entradaPalabra}. Definición: ${datosPalabra.meanings[0].definitions[0].definition}. Sinónimos: ${textoSinonimos}. Ejemplo: ${ejemplo}.`;
                    leerEnVozAlta(textoResultado);
                }
            })
            .then(() => {
                if (idiomaActual === "es") {
                    traducirResultado();
                }
            })
            .catch((error) => {
                resultado.classList.remove("mostrar");
                resultado.innerHTML = `<h3 class="error">${error.message}</h3>`;
                botonVerMas.style.display = "none"; // Ocultar "Explore More" en caso de error
                ajustarScrollPagina();
                setTimeout(() => {
                    document.getElementById("entrada-palabra").value = "";
                    resultado.innerHTML = "";
                    searchContainer.classList.remove("move-to-top");
                }, 1000);
            });
    }

    function ajustarScrollPagina() {
        const alturaContenido = document.body.scrollHeight;
        const alturaVentana = window.innerHeight;
        if (alturaContenido > alturaVentana) {
            document.body.style.overflowY = "auto"; // Permitir scroll en Y
        } else {
            document.body.style.overflowY = "hidden"; // No permitir scroll en Y
        }
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
        historial.splice(index, 1);
        localStorage.setItem("historialBusqueda", JSON.stringify(historial));
        cargarHistorial();
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
                "logo": "WeB DiCtIoNaRy",
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
                "logo": "DiCcIoNaRiO WeB",
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

    function toggleGaleria() {
        if (galeria.style.display === "block") {
            galeria.style.display = "none";
            botonVerMas.textContent = "Explore More";
            document.body.classList.remove("ver-mas-activo");
            footer.classList.remove("mostrar");
        } else {
            galeria.style.display = "block";
            botonVerMas.textContent = "Collapse";
            document.body.classList.add("ver-mas-activo");
            mostrarGaleria();
            footer.classList.add("mostrar");
        }
        ajustarScrollPagina();
    }

    function mostrarGaleria() {
        const galeriaImagenes = document.getElementById("galeria-imagenes");
        galeriaImagenes.innerHTML = "";
        imagenesCargadas.forEach((imagen) => {
            const imgElement = document.createElement("img");
            imgElement.src = imagen.webformatURL;
            imgElement.alt = "Imagen de " + imagen.tags;
            galeriaImagenes.appendChild(imgElement);
        });
    }

    function activarAsistente() {
        if (asistenteActivo) {
            recognition.stop();
            asistenteActivo = false;
            presentacionActiva = false;
            botonAsistente.classList.remove("active");
            botonAsistente.style.backgroundColor = "";
            leerEnVozAlta("Asistente de voz desactivado.");
        } else {
            if (window.hasOwnProperty("webkitSpeechRecognition")) {
                recognition = new webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.lang = "es-ES";
                recognition.start();

                recognition.onresult = function (event) {
                    if (presentacionActiva) return;
                    window.speechSynthesis.cancel();
                    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
                    if (transcript === "desactivar" || transcript === "desactívate") {
                        recognition.stop();
                        asistenteActivo = false;
                        botonAsistente.classList.remove("active");
                        botonAsistente.style.backgroundColor = "";
                        leerEnVozAlta("Asistente de voz desactivado.");
                    } else if (transcript.startsWith("buscar")) {
                        const palabra = transcript.replace("buscar", "").trim();
                        document.getElementById("entrada-palabra").value = palabra;
                        buscarPalabra();
                    } else if (transcript === "leeme" || transcript === "léeme") {
                        leerEnVozAlta(document.getElementById("significado-palabra").textContent);
                    } else if (transcript === "abrir historial") {
                        contenedorHistorial.classList.add("mostrar");
                        cargarHistorial();
                    } else if (transcript === "cerrar historial") {
                        contenedorHistorial.classList.remove("mostrar");
                    } else if (transcript.startsWith("eliminar la búsqueda número")) {
                        const numero = parseInt(transcript.replace("eliminar la búsqueda número", "").trim());
                        eliminarItemHistorial(numero - 1);
                    } else if (transcript === "eliminar la primera búsqueda") {
                        eliminarItemHistorial(0);
                    } else if (transcript === "ver más") {
                        if (galeria.style.display !== "block") {
                            toggleGaleria();
                        }
                    } else if (transcript === "ver menos") {
                        if (galeria.style.display === "block") {
                            toggleGaleria();
                        }
                    } else if (transcript === "traducir página") {
                        traducirPagina();
                    }
                };

                recognition.onerror = function (event) {
                    recognition.stop();
                    asistenteActivo = false;
                    presentacionActiva = false;
                    botonAsistente.classList.remove("active");
                    botonAsistente.style.backgroundColor = "";
                    leerEnVozAlta("Error en el reconocimiento de voz.");
                };

                asistenteActivo = true;
                presentacionActiva = true;
                botonAsistente.classList.add("active");
                botonAsistente.style.backgroundColor = "red";
                leerPresentacionCompleta();
            } else {
                leerEnVozAlta("El reconocimiento de voz no es compatible con este navegador.");
            }
        }
    } 
    
    
    function leerPresentacionCompleta() {
        const presentacion = "Hola, soy su asistente de voz. Para buscar una palabra, diga 'buscar' y la palabra que desea buscar. Para desactivarme, diga 'desactivar'. Para otras funciones, use comandos como 'abrir historial', 'ver más', 'ver menos' o 'traducir página'.";

        presentacionActiva = true;
        const speech = new SpeechSynthesisUtterance(presentacion);
        speech.lang = "es-ES";
        speech.onend = () => {
            presentacionActiva = false;
        };
        window.speechSynthesis.speak(speech);
    }

    function leerEnVozAlta(texto) {
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(texto);
        speech.lang = "es-ES";
        window.speechSynthesis.speak(speech);
    }
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
});




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
            buscarPalabra();
        };

        reconocimiento.onerror = function(event) {
            reconocimiento.stop();
            botonMicrofono.classList.remove("active");
        };
    }
}

function activarAsistente() {
    if (asistenteActivo) {
        recognition.stop();
        asistenteActivo = false;
        presentacionActiva = false;
        botonAsistente.classList.remove("active");
        botonAsistente.style.backgroundColor = "";
        leerEnVozAlta("Asistente de voz desactivado.");
    } else {
        if (window.hasOwnProperty("webkitSpeechRecognition")) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = "es-ES";
            recognition.start();

            recognition.onresult = function (event) {
                if (presentacionActiva) return;
                window.speechSynthesis.cancel();
                const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
                if (transcript === "desactivar" || transcript === "desactívate") {
                    recognition.stop();
                    asistenteActivo = false;
                    botonAsistente.classList.remove("active");
                    botonAsistente.style.backgroundColor = "";
                    leerEnVozAlta("Asistente de voz desactivado.");
                } else if (transcript.startsWith("buscar")) {
                    const palabra = transcript.replace("buscar", "").trim();
                    document.getElementById("entrada-palabra").value = palabra;
                    buscarPalabra();
                } else if (transcript === "leeme" || transcript === "léeme") {
                    leerEnVozAlta(document.getElementById("significado-palabra").textContent);
                } else if (transcript === "abrir historial") {
                    contenedorHistorial.classList.add("mostrar");
                    cargarHistorial();
                } else if (transcript === "cerrar historial") {
                    contenedorHistorial.classList.remove("mostrar");
                } else if (transcript.startsWith("eliminar la búsqueda número")) {
                    const numero = parseInt(transcript.replace("eliminar la búsqueda número", "").trim());
                    eliminarItemHistorial(numero - 1);
                } else if (transcript === "eliminar la primera búsqueda") {
                    eliminarItemHistorial(0);
                } else if (transcript === "ver más") {
                    if (galeria.style.display !== "block") {
                        toggleGaleria();
                    }
                } else if (transcript === "ver menos") {
                    if (galeria.style.display === "block") {
                        toggleGaleria();
                    }
                } else if (transcript === "traducir página") {
                    traducirPagina();
                }
            };

            recognition.onerror = function (event) {
                recognition.stop();
                asistenteActivo = false;
                presentacionActiva = false;
                botonAsistente.classList.remove("active");
                botonAsistente.style.backgroundColor = "";
                leerEnVozAlta("Error en el reconocimiento de voz.");
            };

            asistenteActivo = true;
            presentacionActiva = true;
            botonAsistente.classList.add("active");
            botonAsistente.style.backgroundColor = "red";
            leerPresentacionCompleta();
        } else {
            leerEnVozAlta("El reconocimiento de voz no es compatible con este navegador.");
        }
    }
}