# 🛠️ Manual de Instalación de Requisitos Previos (Guestbook Helm Chart)
Este documento guía la instalación y configuración de todas las herramientas esenciales (Git, Docker, Minikube, Helm, hey) necesarias para desplegar y probar el Chart de Helm del Guestbook en un entorno local de Kubernetes.

## 1. Instalación de Docker y del Clúster de Kubernetes: Minikube
Minikube es la herramienta recomendada para ejecutar un clúster de Kubernetes en un entorno local (una VM con Docker/Podman).

1.1 Instalar Docker (Motor de Contenedores)
Docker es necesario para que Minikube y la construcción de imágenes funcionen correctamente.

```
# 1. Actualizar paquetes e instalar dependencias
sudo apt update
sudo apt install ca-certificates curl gnupg lsb-release -y

# 2. Agregar la clave GPG de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. Agregar el repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Instalar Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# 5. Agregar el usuario actual al grupo docker (requiere reiniciar sesión)
sudo usermod -aG docker $USER
```
***Es posible que se necesite reiniciar la sesión para que tome los cambios***

1.2 Instalar kubectl (Herramienta de Control de K8s)
kubectl es el cliente para interactuar con el clúster.

```
# 1. Descargar la versión más reciente
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# 2. Instalar kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

1.3 Instalar Minikube

```
# 1. Descargar la última versión de Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# 2. Instalar Minikube
sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64

```

## 2. Instalación de Herramientas de Despliegue y Prueba

2.1 Instalar Helm (Gestor de Paquetes de K8s)
Helm es la herramienta principal para desplegar el Chart de la aplicación.

```
# 1. Descargar y desempaquetar Helm
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```
2.2 Instalar Git
Git es necesario para clonar el repositorio del Chart.

```
sudo apt update
sudo apt install git -y
```

2.3 Instalar hey (Herramienta de Prueba de Estrés/Carga)
hey es la herramienta recomendada para simular el tráfico alto y probar la funcionalidad del HPA. Requiere la instalación previa de Go.

```
# 1. Instalar el lenguaje Go
sudo apt install golang-go -y

# 2. Instalar la herramienta 'hey'
sudo apt  install hey

```

## 3. Verificación de Instalación
Confirma que todas las herramientas están listas ejecutando los comandos de versión:

```
docker --version
kubectl version --client
minikube version
helm version
git --version
hey -h # Si muestra la ayuda, está instalado correctamente

```

Una vez que todas estas herramientas están instaladas y minikube start está operativo, el usuario puede proceder con el Paso 1 del README para desplegar la aplicación.



