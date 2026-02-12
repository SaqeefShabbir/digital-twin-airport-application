import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { CSS2DRenderer, CSS2DObject } from 'three-stdlib';
import gsap from 'gsap';

// Airport structure interfaces
interface AirportTerminal {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  capacity: number;
  currentOccupancy: number;
  gates: number;
}

interface AirportRunway {
  id: string;
  name: string;
  position: { start: THREE.Vector3; end: THREE.Vector3 };
  length: number;
  width: number;
  status: 'active' | 'maintenance' | 'closed';
}

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  type: 'arrival' | 'departure';
  status: 'scheduled' | 'boarding' | 'taxiing' | 'takeoff' | 'landing' | 'arrived';
  position: { x: number; y: number; z: number };
  gate: string;
  destination: string;
}

interface WeatherCondition {
  type: 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow';
  intensity: number;
  windSpeed: number;
  windDirection: number;
}

@Component({
  selector: 'app-three-d-visualization',
  templateUrl: './three-d-visualization.html',
  standalone: false,
  styleUrls: ['./three-d-visualization.scss']
})
export class ThreeDVisualization implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;
  @ViewChild('sceneCanvas', { static: true }) sceneCanvas!: ElementRef;
  
  // Three.js core variables
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private animationFrameId: number = 0;
  
  // Scene objects
  private terminals: THREE.Group[] = [];
  private runways: THREE.Line[] = [];
  private airplanes: THREE.Group[] = [];
  private ground!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  
  // Airport data
  terminalsData: AirportTerminal[] = [
    { id: 'T1', name: 'Terminal A', position: { x: -50, y: 0, z: 0 }, capacity: 5000, currentOccupancy: 3200, gates: 15 },
    { id: 'T2', name: 'Terminal B', position: { x: 50, y: 0, z: 0 }, capacity: 3000, currentOccupancy: 2100, gates: 12 },
    { id: 'T3', name: 'Terminal C', position: { x: -50, y: 0, z: 50 }, capacity: 4000, currentOccupancy: 2800, gates: 10 },
    { id: 'T4', name: 'International', position: { x: 50, y: 0, z: 50 }, capacity: 6000, currentOccupancy: 4200, gates: 20 }
  ];
  
  runwaysData: AirportRunway[] = [
    { id: 'R1', name: '09L/27R', position: { start: new THREE.Vector3(-200, 0, -100), end: new THREE.Vector3(200, 0, -100) }, length: 3200, width: 45, status: 'active' },
    { id: 'R2', name: '09R/27L', position: { start: new THREE.Vector3(-200, 0, 100), end: new THREE.Vector3(200, 0, 100) }, length: 2800, width: 45, status: 'active' },
    { id: 'R3', name: '14/32', position: { start: new THREE.Vector3(-150, 0, -150), end: new THREE.Vector3(-150, 0, 150) }, length: 2400, width: 45, status: 'maintenance' }
  ];
  
  flightsData: Flight[] = [
    { id: 'F1', flightNumber: 'AA123', airline: 'American', type: 'arrival', status: 'landing', position: { x: 100, y: 50, z: 80 }, gate: 'A12', destination: 'JFK' },
    { id: 'F2', flightNumber: 'DL456', airline: 'Delta', type: 'departure', status: 'taxiing', position: { x: -30, y: 0, z: -40 }, gate: 'B07', destination: 'LAX' },
    { id: 'F3', flightNumber: 'UA789', airline: 'United', type: 'arrival', status: 'boarding', position: { x: 60, y: 0, z: 20 }, gate: 'C15', destination: 'ORD' },
    { id: 'F4', flightNumber: 'WN012', airline: 'Southwest', type: 'departure', status: 'scheduled', position: { x: -80, y: 0, z: 60 }, gate: 'D03', destination: 'DEN' }
  ];
  
  // Weather
  weather: WeatherCondition = {
    type: 'clear',
    intensity: 0,
    windSpeed: 10,
    windDirection: 45
  };
  
  // UI State
  viewMode: 'overview' | 'terminal' | 'runway' | 'aircraft' = 'overview';
  selectedObject: any = null;
  showLabels = true;
  showGrid = true;
  showWeatherEffects = true;
  autoRotate = false;
  wireframeMode = false;
  isDayTime = true;
  
  // Camera positions
  cameraPositions = {
    overview: { position: new THREE.Vector3(0, 300, 500), target: new THREE.Vector3(0, 0, 0) },
    terminal: { position: new THREE.Vector3(0, 100, 200), target: new THREE.Vector3(0, 0, 0) },
    runway: { position: new THREE.Vector3(0, 50, 150), target: new THREE.Vector3(0, 0, 0) },
    aircraft: { position: new THREE.Vector3(0, 20, 50), target: new THREE.Vector3(0, 0, 0) }
  };
  
  // Simulation
  private simulationSpeed = 1.0;
  isSimulationRunning = true;
  
  // Statistics
  airportStats = {
    totalFlights: 124,
    activeFlights: 8,
    terminalOccupancy: 78,
    runwayUtilization: 65,
    avgWaitTime: '15 min'
  };
  
  constructor() {}
  
  ngOnInit(): void {
    this.initThreeJS();
  }
  
  ngAfterViewInit(): void {
    this.setupScene();
    this.setupControls();
    this.animate();
    this.setupWindowResizeHandler();
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  @HostListener('window:resize')
  onWindowResize(): void {
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }
  
  private initThreeJS(): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.isDayTime ? 0x87CEEB : 0x0a0a2a);
    
    // Create camera
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    this.camera.position.copy(this.cameraPositions.overview.position);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.sceneCanvas.nativeElement,
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create label renderer
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.rendererContainer.nativeElement.appendChild(this.labelRenderer.domElement);
  }
  
  private setupScene(): void {
    // Lighting
    this.setupLighting();
    
    // Ground
    this.createGround();
    
    // Grid helper
    this.gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
    this.gridHelper.visible = this.showGrid;
    this.scene.add(this.gridHelper);
    
    // Airport infrastructure
    this.createTerminals();
    this.createRunways();
    this.createTaxiways();
    this.createControlTower();
    
    // Airplanes
    this.createAirplanes();
    
    // Weather effects
    if (this.showWeatherEffects) {
      this.createWeatherEffects();
    }
  }
  
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, this.isDayTime ? 0.6 : 0.3);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, this.isDayTime ? 1.0 : 0.5);
    directionalLight.position.set(100, 300, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    this.scene.add(directionalLight);
    
    // Hemisphere light for more natural outdoor lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: this.isDayTime ? 0x7CFC00 : 0x2a5c2a,
      side: THREE.DoubleSide 
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    
    // Add grass texture or runway markings
    this.addRunwayMarkings();
  }
  
  private addRunwayMarkings(): void {
    // Create runway centerlines
    const runwayLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    
    this.runwaysData.forEach(runway => {
      const points = [
        runway.position.start,
        runway.position.end
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, runwayLineMaterial);
      line.name = `runway-${runway.id}`;
      this.scene.add(line);
      this.runways.push(line);
      
      // Add runway label
      this.addLabel(runway.name, 
        new THREE.Vector3(
          (runway.position.start.x + runway.position.end.x) / 2,
          5,
          (runway.position.start.z + runway.position.end.z) / 2
        )
      );
    });
  }
  
  private createTerminals(): void {
    this.terminalsData.forEach(terminal => {
      const terminalGroup = new THREE.Group();
      terminalGroup.name = `terminal-${terminal.id}`;
      terminalGroup.position.set(terminal.position.x, terminal.position.y, terminal.position.z);
      
      // Main terminal building
      const buildingGeometry = new THREE.BoxGeometry(40, 20, 80);
      const buildingMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4682B4,
        wireframe: this.wireframeMode 
      });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.castShadow = true;
      building.receiveShadow = true;
      terminalGroup.add(building);
      
      // Terminal roof
      const roofGeometry = new THREE.CylinderGeometry(25, 20, 2, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 11;
      roof.rotation.y = Math.PI / 4;
      terminalGroup.add(roof);
      
      // Jet bridges
      for (let i = 0; i < terminal.gates; i++) {
        const jetBridge = this.createJetBridge(i);
        jetBridge.position.set(20, 2, -35 + i * 7);
        terminalGroup.add(jetBridge);
      }
      
      // Add label
      this.addLabel(terminal.name, new THREE.Vector3(terminal.position.x, 25, terminal.position.z));
      
      this.scene.add(terminalGroup);
      this.terminals.push(terminalGroup);
    });
  }
  
  private createJetBridge(index: number): THREE.Group {
    const jetBridgeGroup = new THREE.Group();
    
    // Main bridge
    const bridgeGeometry = new THREE.BoxGeometry(2, 1, 15);
    const bridgeMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
    const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    jetBridgeGroup.add(bridge);
    
    // Connector
    const connectorGeometry = new THREE.BoxGeometry(1, 1, 3);
    const connector = new THREE.Mesh(connectorGeometry, bridgeMaterial);
    connector.position.set(0.5, 0, 6);
    jetBridgeGroup.add(connector);
    
    return jetBridgeGroup;
  }
  
  private createRunways(): void {
    // Runway surfaces
    this.runwaysData.forEach(runway => {
      const runwayLength = runway.length / 10; // Scale down for visualization
      const runwayWidth = runway.width / 2;
      
      const runwayGeometry = new THREE.PlaneGeometry(runwayLength, runwayWidth);
      const runwayMaterial = new THREE.MeshLambertMaterial({ 
        color: runway.status === 'active' ? 0x808080 : 
               runway.status === 'maintenance' ? 0xFFA500 : 0xFF0000,
        side: THREE.DoubleSide
      });
      
      const runwayMesh = new THREE.Mesh(runwayGeometry, runwayMaterial);
      runwayMesh.rotation.x = -Math.PI / 2;
      
      // Position runway
      const centerX = (runway.position.start.x + runway.position.end.x) / 2;
      const centerZ = (runway.position.start.z + runway.position.end.z) / 2;
      runwayMesh.position.set(centerX, 0.1, centerZ);
      
      // Rotate to align with runway direction
      const direction = new THREE.Vector3().subVectors(runway.position.end, runway.position.start);
      runwayMesh.rotation.y = Math.atan2(direction.x, direction.z);
      
      runwayMesh.receiveShadow = true;
      this.scene.add(runwayMesh);
    });
  }
  
  private createTaxiways(): void {
    const taxiwayMaterial = new THREE.LineBasicMaterial({ color: 0xFFFF00 });
    
    // Create a basic taxiway network
    const taxiwayPaths = [
      [new THREE.Vector3(-150, 0.2, 0), new THREE.Vector3(150, 0.2, 0)],
      [new THREE.Vector3(0, 0.2, -150), new THREE.Vector3(0, 0.2, 150)],
      [new THREE.Vector3(-100, 0.2, -100), new THREE.Vector3(100, 0.2, 100)]
    ];
    
    taxiwayPaths.forEach(path => {
      const geometry = new THREE.BufferGeometry().setFromPoints(path);
      const line = new THREE.Line(geometry, taxiwayMaterial);
      this.scene.add(line);
    });
  }
  
  private createControlTower(): void {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(0, 0, -200);
    
    // Tower base
    const baseGeometry = new THREE.CylinderGeometry(5, 5, 30, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 15;
    towerGroup.add(base);
    
    // Tower top (control room)
    const topGeometry = new THREE.BoxGeometry(10, 8, 10);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 34;
    towerGroup.add(top);
    
    // Radar dome
    const domeGeometry = new THREE.SphereGeometry(4, 16, 16);
    const domeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 42;
    towerGroup.add(dome);
    
    this.scene.add(towerGroup);
    this.addLabel('Control Tower', new THREE.Vector3(0, 50, -200));
  }
  
  private createAirplanes(): void {
    this.flightsData.forEach(flight => {
      const airplane = this.createAirplane(flight);
      airplane.position.set(flight.position.x, flight.position.y, flight.position.z);
      airplane.name = `airplane-${flight.id}`;
      this.scene.add(airplane);
      this.airplanes.push(airplane);
      
      // Add flight label
      this.addLabel(
        `${flight.flightNumber}\n${flight.airline}`,
        new THREE.Vector3(flight.position.x, flight.position.y + 10, flight.position.z)
      );
    });
  }
  
  private createAirplane(flight: Flight): THREE.Group {
    const airplaneGroup = new THREE.Group();
    
    // Fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(1, 1, 20, 8);
    const fuselageMaterial = new THREE.MeshLambertMaterial({ 
      color: this.getAirlineColor(flight.airline) 
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    airplaneGroup.add(fuselage);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(20, 0.5, 4);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    airplaneGroup.add(wings);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(2, 6, 1);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(-9, 3, 0);
    airplaneGroup.add(tail);
    
    // Engines
    const engineGeometry = new THREE.CylinderGeometry(0.8, 0.6, 4, 8);
    const engineMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    
    const engine1 = new THREE.Mesh(engineGeometry, engineMaterial);
    engine1.position.set(5, 0, 2);
    engine1.rotation.x = Math.PI / 2;
    airplaneGroup.add(engine1);
    
    const engine2 = new THREE.Mesh(engineGeometry, engineMaterial);
    engine2.position.set(5, 0, -2);
    engine2.rotation.x = Math.PI / 2;
    airplaneGroup.add(engine2);
    
    // Status indicator
    const statusLight = new THREE.PointLight(
      this.getFlightStatusColorHex(flight.status),
      1,
      20
    );
    statusLight.position.set(-10, 0, 0);
    airplaneGroup.add(statusLight);
    
    return airplaneGroup;
  }
  
  private createWeatherEffects(): void {
    if (this.weather.type === 'rain') {
      this.createRainEffect();
    } else if (this.weather.type === 'fog') {
      this.createFogEffect();
    } else if (this.weather.type === 'snow') {
      this.createSnowEffect();
    } else if (this.weather.type === 'cloudy') {
      this.createClouds();
    }
  }
  
  private createRainEffect(): void {
    // Create particle system for rain
    const rainCount = 5000;
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 1000;
      rainPositions[i + 1] = Math.random() * 300;
      rainPositions[i + 2] = (Math.random() - 0.5) * 1000;
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xAAAAFF,
      size: 0.5,
      transparent: true
    });
    
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    this.scene.add(rain);
  }
  
  private createClouds(): void {
    // Add some cloud formations
    for (let i = 0; i < 10; i++) {
      const cloud = this.createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 800,
        100 + Math.random() * 50,
        (Math.random() - 0.5) * 800
      );
      this.scene.add(cloud);
    }
  }
  
  private createCloud(): THREE.Group {
    const cloudGroup = new THREE.Group();
    const cloudGeometry = new THREE.SphereGeometry(1, 8, 8);
    const cloudMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8
    });
    
    // Create cloud from multiple spheres
    for (let i = 0; i < 5; i++) {
      const sphere = new THREE.Mesh(cloudGeometry, cloudMaterial);
      sphere.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 10
      );
      sphere.scale.setScalar(3 + Math.random() * 2);
      cloudGroup.add(sphere);
    }
    
    return cloudGroup;
  }
  
  private createFogEffect(): void {
    this.scene.fog = new THREE.Fog(0xAAAAAA, 100, 300);
  }
  
  private createSnowEffect(): void {
    // Similar to rain but with white particles
    const snowCount = 3000;
    const snowGeometry = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    
    for (let i = 0; i < snowCount * 3; i += 3) {
      snowPositions[i] = (Math.random() - 0.5) * 1000;
      snowPositions[i + 1] = Math.random() * 300;
      snowPositions[i + 2] = (Math.random() - 0.5) * 1000;
    }
    
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    
    const snowMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1.5,
      transparent: true,
      opacity: 0.8
    });
    
    const snow = new THREE.Points(snowGeometry, snowMaterial);
    this.scene.add(snow);
  }
  
  private addLabel(text: string, position: THREE.Vector3): void {
    if (!this.showLabels) return;
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'three-label';
    labelDiv.textContent = text;
    labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    labelDiv.style.color = 'white';
    labelDiv.style.padding = '2px 6px';
    labelDiv.style.borderRadius = '3px';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.whiteSpace = 'pre-line';
    labelDiv.style.textAlign = 'center';
    
    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    this.scene.add(label);
  }
  
  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 2000;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.0;
  }
  
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta() * this.simulationSpeed;
    
    // Update controls
    this.controls.update();
    
    // Update airplanes (simulate movement)
    if (this.isSimulationRunning) {
      this.updateAirplanePositions(delta);
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
  
  private updateAirplanePositions(delta: number): void {
    this.airplanes.forEach((airplane, index) => {
      const flight = this.flightsData[index];
      if (!flight) return;
      
      // Simple movement logic based on flight status
      switch (flight.status) {
        case 'taxiing':
          airplane.position.x += delta * 10;
          break;
        case 'takeoff':
          airplane.position.y += delta * 20;
          airplane.position.x += delta * 30;
          break;
        case 'landing':
          airplane.position.y -= delta * 15;
          airplane.position.x -= delta * 25;
          break;
      }
      
      // Keep airplanes within bounds
      if (airplane.position.x > 300) airplane.position.x = -300;
      if (airplane.position.y > 200) airplane.position.y = 0;
    });
  }
  
  private setupWindowResizeHandler(): void {
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    window.removeEventListener('resize', () => this.onWindowResize());
    
    // Dispose of Three.js resources
    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        } else if (Array.isArray(object.material)) {
          object.material.forEach((material: any) => material.dispose());
        }
      }
    });
    
    this.renderer.dispose();
    // To this:
    // this.labelRenderer.dispose(); // CSS2DRenderer doesn't have dispose method

    // And add:
    if (this.labelRenderer && this.labelRenderer.domElement) {
      this.labelRenderer.domElement.remove();
    }
  }
  
  // UI Methods
  setViewMode(mode: 'overview' | 'terminal' | 'runway' | 'aircraft'): void {
    this.viewMode = mode;
    const target = this.cameraPositions[mode];
    
    // Smooth camera transition
    gsap.to(this.camera.position, {
      duration: 1,
      x: target.position.x,
      y: target.position.y,
      z: target.position.z,
      ease: "power2.inOut"
    });
    
    gsap.to(this.controls.target, {
      duration: 1,
      x: target.target.x,
      y: target.target.y,
      z: target.target.z,
      ease: "power2.inOut"
    });
  }
  
  toggleLabels(): void {
    this.showLabels = !this.showLabels;
    this.scene.traverse((object: any) => {
      if (object instanceof CSS2DObject) {
        object.visible = this.showLabels;
      }
    });
  }
  
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.gridHelper.visible = this.showGrid;
  }
  
  toggleWeatherEffects(): void {
    this.showWeatherEffects = !this.showWeatherEffects;
    if (this.showWeatherEffects) {
      this.createWeatherEffects();
    } else {
      // Remove weather effects
      this.scene.fog = null;
      this.scene.traverse((object: any) => {
        if (object instanceof THREE.Points) {
          this.scene.remove(object);
        }
      });
    }
  }
  
  toggleDayNight(): void {
    this.isDayTime = !this.isDayTime;
    this.scene.background = new THREE.Color(this.isDayTime ? 0x87CEEB : 0x0a0a2a);
    
    // Update ground color
    if (this.ground && this.ground.material instanceof THREE.MeshLambertMaterial) {
      this.ground.material.color.set(this.isDayTime ? 0x7CFC00 : 0x2a5c2a);
    }
    
    // Update lighting
    this.scene.children.forEach((child: any) => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = this.isDayTime ? 0.6 : 0.3;
      }
      if (child instanceof THREE.DirectionalLight) {
        child.intensity = this.isDayTime ? 1.0 : 0.5;
      }
    });
  }
  
  toggleWireframe(): void {
    this.wireframeMode = !this.wireframeMode;
    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshLambertMaterial) {
        object.material.wireframe = this.wireframeMode;
      }
    });
  }
  
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
  }
  
  toggleSimulation(): void {
    this.isSimulationRunning = !this.isSimulationRunning;
  }
  
  setWeatherCondition(condition: 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow'): void {
    this.weather.type = condition;
    
    // Remove existing weather effects
    this.scene.fog = null;
    this.scene.traverse((object: any) => {
      if (object instanceof THREE.Points || object.name.includes('cloud')) {
        this.scene.remove(object);
      }
    });
    
    // Create new weather effects
    if (this.showWeatherEffects) {
      this.createWeatherEffects();
    }
  }
  
  selectObject(object: any): void {
    this.selectedObject = object;
    
    // Highlight selected object (you can implement visual highlighting)
    console.log('Selected:', object);
  }
  
  private getAirlineColor(airline: string): number {
    const colors: { [key: string]: number } = {
      'American': 0x002868, // Blue
      'Delta': 0x003366,    // Dark Blue
      'United': 0x0033CC,   // Blue
      'Southwest': 0xFFC72C, // Yellow
      'JetBlue': 0x0038A8,   // Blue
      'Alaska': 0x0C2340    // Navy
    };
    
    return colors[airline] || 0x808080;
  }
  
  // Replace the existing getFlightStatusColor method with this:
  getFlightStatusColorClass(status: string): string {
    const colorMap: { [key: string]: string } = {
      'scheduled': 'primary',      // Yellow - use primary as fallback
      'boarding': 'accent',        // Orange
      'taxiing': 'warn',           // Green - use warn as green alternative
      'takeoff': 'primary',        // Blue
      'landing': 'warn',           // Red - use warn for red
      'arrived': 'accent'          // Dark Green - use accent
    };
    
    return colorMap[status] || 'primary';
  }

  // Keep this method for the Three.js point light colors:
  getFlightStatusColorHex(status: string): number {
    const colors: { [key: string]: number } = {
      'scheduled': 0xFFFF00, // Yellow
      'boarding': 0xFFA500,  // Orange
      'taxiing': 0x00FF00,   // Green
      'takeoff': 0x0000FF,   // Blue
      'landing': 0xFF0000,   // Red
      'arrived': 0x008000    // Dark Green
    };
    
    return colors[status] || 0xFFFFFF;
  }
  
  // Statistics methods
  updateStatistics(): void {
    // In a real app, this would fetch live data
    this.airportStats.activeFlights = this.flightsData.filter(f => 
      f.status === 'taxiing' || f.status === 'takeoff' || f.status === 'landing'
    ).length;
    
    this.airportStats.terminalOccupancy = Math.round(
      this.terminalsData.reduce((sum, t) => sum + (t.currentOccupancy / t.capacity), 0) / 
      this.terminalsData.length * 100
    );
  }
  
  // Export scene as image
  captureScreenshot(): void {
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `airport-digital-twin-${new Date().toISOString()}.png`;
    link.click();
  }
}