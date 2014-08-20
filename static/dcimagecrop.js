var dcImageCrop = angular.module("dcImageCrop", []);

dcImageCrop.directive("dcImageCrop", ["$compile", function($compile) {
    return {
        restrict: "A",
        scope : {
            dcImageCrop: "&",
            dcAspect: "&",
            id: "@",
            src: "@"
        },
        link: function (scope, elem, attr) {

            angular.element(elem).on("load", function() {
                Init();
                if (scope.dcImageCrop() === false) {
                      Hide();
                }
            });

            scope.$watch(scope.dcImageCrop, function(newValue) {
                if (newValue == true) {
                    Reset();
                    Start();
                } else {
                    Hide();
                }
            });

            scope.$watch(scope.dcAspect, function (prop) {
                scope.prop = getProp(prop);
            });

            var getProp     = function(prop) {
                if (prop != null && prop.match(/^[0-9]{1,2}:[0-9]{1,2}$/)) {
                    var p = prop.split(":");
                    prop = p[0] / p[1];
                } else {
                    prop = null;
                }
                return prop;
            };

            scope.prop = getProp(scope.dcAspect());



            scope.cursor = {
                "e0" : "nw-resize",
                "e1" : "ne-resize",
                "e2" : "se-resize",
                "e3" : "sw-resize",
                "cuadro" : "move"
            };

            var Init    = function() {

                // La posición de la imagen respecto a la pantalla
                scope.posImagen   = {
                    "x" : angular.element(elem).get(0).getBoundingClientRect().left,
                    "y" : angular.element(elem).get(0).getBoundingClientRect().top
                };

                scope.dimImagen   = {
                    "height" : angular.element(elem).outerHeight(),
                    "width"  : angular.element(elem).outerWidth()
                };

                // La posición del ratón respecto de la capa (no de la ventana)
                scope.posRaton    = {
                    "x" : null,
                    "y" : null
                };

                // Aquí se almacenará la esquina que se está moviendo
                scope.moviendo    = null;

                scope.container     = document.createElement("div");
                angular.element(scope.container).css({
                    "position" : "absolute",
                    "display" : "none",
                    "top" : angular.element(elem).position().top + "px",
                    "left": angular.element(elem).position().left + "px",
                    "width" : angular.element(elem).outerWidth() + "px",
                    "height" : angular.element(elem).outerHeight() + "px",
                    "background-color" : "rgba(0,0,0,0.7)",
                    "cursor" : "crosshair"
                }).attr("as-tipo", "container");

                angular.element(elem).parent().append($compile(scope.container)(scope));
                $compile(angular.element(elem).attr("draggable", "false"))(scope);

                Start();
            };

            var Start   = function() {
                angular.element(scope.container).unbind("mousedown", Mover);
                angular.element(scope.container).unbind("mouseup", Parar);
                angular.element(scope.container).unbind("mouseover", Actualizar);
                angular.element(scope.container).empty().css({
                    "display" : "block",
                    "background-color" : "rgba(0,0,0,0.7)"
                }).attr("as-tipo", "container");

                // En este array almacenamos las capas que corresponden a las esquinas del cuadro

                /**
                    [0] ------------------- [1]
                     |                       |
                     |       ESQUINAS        |
                     |                       |
                    [3] ------------------- [2]
                **/
                scope.esquinas = new Array();
                for (var i = 0; i < 4; i++) {
                    scope.esquinas[i]    = {
                        "x" : null,
                        "y" : null,
                        "capa" : null
                    };
                }

                // En este array almacenamos las dimensiones del cuadro [top, left, alto, ancho]
                scope.cuadro   = [0, 0, 0, 0];

                // En este array almacenamos las capas que oscurecerán la foto
                scope.capas = new Array();

                for (var i = 0; i < 4; i ++) {
                    scope.capas[i] = {
                        "x" : null,
                        "y" : null,
                        "capa" : null
                    };
                }

                scope.seleccion     = null;

                angular.element(scope.container).bind("mousedown", Mover);
                angular.element(scope.container).bind("mouseup", Parar);
            }

            var Mover   = function(ev) {
                // Identificamos que es lo que estamos moviendo
                ev.stopPropagation();

                // Quitamos el fondo negro
                angular.element(scope.container).css({
                    "background-color" : "transparent"
                });

                // Obtenemos la posición del ratón
                var raton       = [ev.pageX, ev.pageY];

                // Obtenemos el lugar de la imagen donde se ha hecho la pulsación
                scope.pulsacion = [raton[0] - scope.posImagen.x, raton[1] - scope.posImagen.y];

                // Obtenemos en caso de que se haya pulsado dentro del cuadro de selección, el offse
                scope.offset    = [scope.pulsacion[0] - scope.esquinas[0].x, scope.pulsacion[1] - scope.esquinas[0].y]

                switch (angular.element(ev.currentTarget).attr("as-tipo")) {
                        case "container":
                            // Se ha pulsado sobre el contenedor, situamos todas las esquinas en el mismo sitio
                            // y establecemos como moviendo la esquina inferior derecha
                            scope.esquinas[0].x = scope.pulsacion[0];
                            scope.esquinas[0].y = scope.pulsacion[1];

                            scope.esquinas[2].x = scope.pulsacion[0];
                            scope.esquinas[2].y = scope.pulsacion[1];

                            scope.moviendo = "e2";
                            break;
                        default:
                            scope.moviendo = angular.element(ev.currentTarget).attr("as-tipo");
                            // Se ha pulsado sobre la esquina inferior derecha
                            break;
                }

                angular.element(scope.container).bind("mousemove", Actualizar);
            };

            var Parar   = function(ev) {
                angular.element(scope.container).unbind("mousemove", Actualizar);
            };

            var Actualizar = function(ev) {

                ev.stopPropagation();

                scope.raton   = [ev.pageX - scope.posImagen.x, ev.pageY - scope.posImagen.y];

                // Ahora comprobamos que es lo que estamos moviendo
                if (scope.moviendo == "cuadro") {
                    // Estamos moviendo todo el cuadro de selección
                    MoverCuadro();
                } else if (scope.moviendo.match(/^e[0-3]$/)) {
                    // Estamos moviendo una esquina
                    MoverEsquina();
                } else if (scope.moviendo.match(/^l[0-3]$/)) {
                    // Estamos moviendo un lado
                    MoverLado();
                }

                Dibujar();
            };

            var MoverCuadro     = function() {

                // Calculamos la esquina superior izquierda
                scope.esquinas[0].x   = scope.raton[0] - scope.offset[0];
                scope.esquinas[0].y   = scope.raton[1] - scope.offset[1];

                // Ahora calculamos la esquina inferior derecha
                scope.esquinas[2].x   = scope.esquinas[0].x + scope.cuadro[2]; // Ahora sumamos el ancho del cuadro a la esquina superior izquierda
                scope.esquinas[2].y   = scope.esquinas[0].y + scope.cuadro[3]; // Ahora sumamos el alto a la esquina superior izquierda

                Proporcion();
            };

            var MoverEsquina    = function() {
                switch (scope.moviendo) {
                        case "e0":
                            scope.esquinas[0].x = scope.raton[0];
                            scope.esquinas[0].y = scope.raton[1];
                            break;
                        case "e1":
                            scope.esquinas[0].y = scope.raton[1];
                            scope.esquinas[2].x = scope.raton[0];
                            break;
                        case "e2":
                            scope.esquinas[2].x = scope.raton[0];
                            scope.esquinas[2].y = scope.raton[1];
                            break;
                        case "e3":
                            scope.esquinas[0].x = scope.raton[0];
                            scope.esquinas[2].y = scope.raton[1];
                            break;
                }

                Proporcion();
            };

            var MoverLado       = function() {
                switch (scope.moviendo) {
                        case "l0":
                            scope.esquinas[0].x = scope.pulsacion[0];
                            break;
                        case "l1":
                            scope.esquinas[0].y = scope.pulsacion[1];
                            break;
                        case "l2":
                            scope.esquinas[2].x = scope.pulsacion[0];
                            break;
                        case "l3":
                            scope.esquinas[2].y = scope.pulsacion[1];
                            break;
                }

                Proporcion();
            };

            // Función que corregirá la proporción del cuadro de selección en caso de que se haya establecido
            var Proporcion      = function() {

                // Comprobamos que no se haya salido por los bordes de la imagen
                if (scope.esquinas[0].y <= 0 || scope.esquinas[0].x <= 0) {
                    scope.esquinas[0].x     = (scope.esquinas[0].x <= 0) ? 0 : scope.esquinas[0].x;
                    scope.esquinas[0].y     = (scope.esquinas[0].y <= 0) ? 0 : scope.esquinas[0].y;
                    scope.esquinas[2].x     = scope.esquinas[0].x + scope.cuadro[2];
                    scope.esquinas[2].y     = scope.esquinas[0].y + scope.cuadro[3];
                }  if (scope.esquinas[2].x >= scope.dimImagen.width || scope.esquinas[2].y >= scope.dimImagen.height) {
                    scope.esquinas[2].x     = (scope.esquinas[2].x > scope.dimImagen.width) ? scope.dimImagen.width : scope.esquinas[2].x;
                    scope.esquinas[2].y     = (scope.esquinas[2].y > scope.dimImagen.height) ? scope.dimImagen.height : scope.esquinas[2].y;

                    scope.esquinas[0].x     = scope.esquinas[2].x - scope.cuadro[2];
                    scope.esquinas[0].y     = scope.esquinas[2].y - scope.cuadro[3];
                }


                // Ahora comprobamos si la proporción del cuadro es correcta
                if (scope.prop != null) {
                    switch (scope.moviendo) {
                            case "e0":
                                scope.esquinas[0].x = scope.esquinas[2].x - (scope.cuadro[3] * scope.prop);
                                break;
                            case "e1":
                                scope.esquinas[2].x = scope.esquinas[0].x + (scope.cuadro[3] * scope.prop);
                                break;
                            case "e2":
                                scope.esquinas[2].x = scope.esquinas[0].x + (scope.cuadro[3] * scope.prop);
                                break;
                            case "e3":
                                scope.esquinas[0].x = scope.esquinas[2].x - (scope.cuadro[3] * scope.prop);
                                break;
                    }
                };

            };

            // Función que se encarga de dibujar todos los elementos en la pantalla
            var Dibujar     = function() {

                // Ahora recalculamos las esquinas 1 y 3
                scope.esquinas[1].x     = scope.esquinas[2].x;
                scope.esquinas[1].y     = scope.esquinas[0].y;

                scope.esquinas[3].x     = scope.esquinas[0].x;
                scope.esquinas[3].y     = scope.esquinas[2].y;

                scope.cuadro[0] = scope.esquinas[0].x;
                scope.cuadro[1] = scope.esquinas[0].y;
                scope.cuadro[2] = scope.esquinas[1].x - scope.esquinas[0].x;
                scope.cuadro[3] = scope.esquinas[2].y - scope.esquinas[0].y;


                // Ahora definimos la posición de las capas oscuras
                scope.capas[0].x    = 0;
                scope.capas[0].y    = 0;
                scope.capas[0].width = scope.dimImagen.width;
                scope.capas[0].height = scope.esquinas[0].y;

                scope.capas[1].x    = 0;
                scope.capas[1].y    = scope.esquinas[0].y;
                scope.capas[1].width = scope.esquinas[0].x;
                scope.capas[1].height = scope.esquinas[3].y - scope.esquinas[0].y;

                scope.capas[2].x    = scope.esquinas[1].x;
                scope.capas[2].y    = scope.esquinas[1].y;
                scope.capas[2].width = scope.dimImagen.width - scope.esquinas[1].x;
                scope.capas[2].height = scope.esquinas[2].y - scope.esquinas[1].y;

                scope.capas[3].x    = 0;
                scope.capas[3].y    = scope.esquinas[2].y;
                scope.capas[3].width = scope.dimImagen.width,
                scope.capas[3].height = scope.dimImagen.height - scope.esquinas[2].y;



                // Ahora pintamos las capas oscuras
                for (var i in scope.capas) {
                    if (scope.capas[i].capa === null) {
                        scope.capas[i].capa = document.createElement("div");
                        angular.element(scope.capas[i].capa).css({
                            "position" : "absolute",
                            "display" : "block",
                            "background-color" : "rgba(0,0,0,0.7)"
                        });
                        angular.element(scope.container).append($compile(scope.capas[i].capa)(scope));
                    }

                    angular.element(scope.capas[i].capa).css({
                        "top" : scope.capas[i].y + "px",
                        "left" : scope.capas[i].x + "px",
                        "width" : scope.capas[i].width + "px",
                        "height" : scope.capas[i].height + "px"
                    });

                }

                // Ahora el cuadro de selección
                if (scope.seleccion === null) {
                    scope.seleccion = document.createElement("div");
                    angular.element(scope.seleccion).css({
                        "position" : "absolute",
                        "display" : "block",
                        "border" : "1px dotted #e0e0e0",
                        "cursor" : "move"
                    }).attr("as-tipo", "cuadro").attr("draggable", "false").bind("mousedown", Mover).bind("mouseup", Parar);

                    angular.element(scope.container).append($compile(scope.seleccion)(scope));
                }

                angular.element(scope.seleccion).css({
                    "top" : scope.esquinas[0].y + "px",
                    "left" : scope.esquinas[0].x + "px",
                    "width" : scope.cuadro[2] + "px",
                    "height" : scope.cuadro[3] + "px"
                });


                // AHora por cada esquina creamos
                for (var i in scope.esquinas) {
                    if (scope.esquinas[i].capa === null) {
                        scope.esquinas[i].capa = document.createElement("div");
                        angular.element(scope.esquinas[i].capa).css({
                            "position" : "absolute",
                            "display" : "block",
                            "width" : "4px",
                            "height" : "4px",
                            "background-color" : "white",
                            "margin" : "-2px",
                            "cursor" : scope.cursor["e" + i]
                        }).attr("as-tipo", "e" + i).attr("draggable", "false");

                        angular.element(scope.esquinas[i].capa).bind("mousedown", Mover).bind("mouseup", Parar);
                        angular.element(scope.container).append($compile(scope.esquinas[i].capa)(scope));
                    }

                    // Ahora le damos estilo
                    angular.element(scope.esquinas[i].capa).css({
                        "top" : scope.esquinas[i].y + "px",
                        "left" : scope.esquinas[i].x + "px"
                    });
                }

                var ratio   = (scope.prop === null) ? scope.cuadro[2] / scope.cuadro[3] : scope.prop;
                //Ahora emitimos las coordenadas al scope
                scope.$emit("as:selection", {
                    "id" : scope.id,
                    "proporcion" : ratio,
                    "image" : {
                        "width" : scope.dimImagen.width,
                        "height" : scope.dimImagen.height,
                        "src" : scope.src
                    },
                    "coordenadas" : [
                        {
                            "x" : scope.esquinas[0].x,
                            "y" : scope.esquinas[0].y
                        },
                        {
                            "x" : scope.esquinas[1].x,
                            "y" : scope.esquinas[1].y
                        },
                        {
                            "x" : scope.esquinas[2].x,
                            "y" : scope.esquinas[2].y
                        },
                        {
                            "x" : scope.esquinas[3].x,
                            "y" : scope.esquinas[3].y
                        }
                    ],
                    "caja" : {
                        "left" : scope.esquinas[0].x,
                        "top" : scope.esquinas[0].y,
                        "width" : scope.cuadro[2],
                        "height" : scope.cuadro[3]
                    },
                    "cajaPorcentaje": {
                        "left" : scope.esquinas[0].x * 100 / scope.dimImagen.width,
                        "top" : scope.esquinas[0].y * 100 / scope.dimImagen.height,
                        "width" : scope.cuadro[2] * 100 / scope.dimImagen.width,
                        "height" : scope.cuadro[3] * 100 / scope.dimImagen.height
                    }
                });

                Over();
            };

            var Over = function() {
                if (scope.moviendo.match(/^e[0-3]$/)) {
                    switch (scope.moviendo) {
                            case "e0":
                                if (scope.raton[0] > scope.esquinas[1].x) {
                                    scope.moviendo = "e1";
                                } else if (scope.raton[1] > scope.esquinas[3].y) {
                                    scope.moviendo = "e3";
                                }
                                break;
                            case "e1":
                                if (scope.raton[0] < scope.esquinas[0].x) {
                                    scope.moviendo = "e0";
                                } else if (scope.raton[1] > scope.esquinas[2].y) {
                                    scope.moviendo = "e2";
                                }
                                break;
                            case "e2":
                                if (scope.raton[0] < scope.esquinas[3].x) {
                                    scope.moviendo = "e3";
                                } else if (scope.raton[1] < scope.esquinas[1].y) {
                                    scope.moviendo = "e1";
                                }
                                break;
                            case "e3":
                                if (scope.raton[0] > scope.esquinas[2].x) {
                                    scope.moviendo = "e2";
                                } else if (scope.raton[1] < scope.esquinas[0].y) {
                                    scope.moviendo = "e0";
                                }
                                break;
                    }
                };
            };

            var Reset       = function() {
                angular.element(scope.container).css({
                    "background-color" : "rgba(0,0,0,0.7)",
                    "display" : "absolute"
                });
            };

            var Hide        = function() {
                angular.element(scope.container).empty().css({
                    "display" : "none"
                });
            }

        }
    }
}]);

dcImageCrop.directive("dcCropPreview", ["$compile", function($compile) {
    return {
        restrict: "E",
        scope: {
            "dcCropData": "&",
            "width" : "@",
            "height" : "@"
        },
        link: function (scope, elem, attr) {
            // Ahora vamos a crear el objeto canvas dentro de la imagen
            var canvas  = document.createElement("canvas");
            angular.element(canvas);

            var context = canvas.getContext("2d");
            var img     = new Image();

            angular.element(elem).parent().append($compile(canvas)(scope));

            scope.$watch(scope.dcCropData, function(val,o) {
                actualizar();
            });

            imagen = false;

            var dim = {
                "width" : null,
                "height" : null
            };

            var actualizar = function() {

                var data = scope.dcCropData();

                if (!imagen && data != null) {
                    imagen = true;

                    angular.element(img).attr("src", data.image.src).on("load", function() {
                        dim.height = img.naturalHeight;
                        dim.width  = img.naturalWidth;

                        actualizar();
                    });
                } else if (data != null) {

                    if (scope.width == undefined) {
                        if (scope.height != undefined) {
                            scope.width = scope.height * data.proporcion;
                        } else {
                            scope.width = 100;
                            scope.height = 100 / data.proporcion;
                        }
                    } else {
                        scope.height = scope.width / data.proporcion;
                    }

                    angular.element(canvas).attr("width", scope.width).attr("height", scope.height);

                    var ancho   = data.cajaPorcentaje.width * dim.width / 100;
                    var alto    = data.cajaPorcentaje.height * dim.height / 100;
                    var left    = data.cajaPorcentaje.left * dim.width / 100;
                    var top     = data.cajaPorcentaje.top * dim.height / 100;

                    context.drawImage(img, left, top, ancho, alto, 0,0, scope.width, scope.height);
                }
            };
        }
    }
}]);
