var test = angular.module("test", ["dcImageCrop"]);

test.controller("pruebas", ["$scope", function($scope) {

    $scope.$on("as:selection", function(ev, data) {
        $scope.data = data;
        $scope.$apply();
    });

    $scope.activar = function() {
        $scope.activo = !$scope.activo;
        $scope.txtBtn = ($scope.txtBtn == "Activar") ? "Desactivar" : "Activar";
    };

    $scope.activo = false;
    $scope.txtBtn = "Activar";
    $scope.data = null;
}]);
