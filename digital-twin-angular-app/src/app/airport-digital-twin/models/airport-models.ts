  export interface AlertPriority {
    value: number;
    label: string;
    color: string;
    icon: string;
  }

  export interface AlertType {
    value: string;
    label: string;
    icon: string;
  }
  
  export interface AlertDialogData {
    alert?: Alert;
    mode: 'view' | 'create' | 'edit';
  }

  export interface AlertSettings {
    enableAlertSounds: boolean;
    enableAlertPopup: boolean;
    enableEmailAlerts: boolean;
    criticalAlertSound: string;
    warningAlertSound: string;
    alertTypes: AlertTypeSetting[];
  }
  
  export interface AlertTypeSetting {
    id: string;
    name: string;
    enabled: boolean;
    sound: boolean;
    popup: boolean;
    email: boolean;
  }

  export interface DataSource {
    id: string;
    name: string;
    enabled: boolean;
    description: string;
  }
  
  export interface DashboardSettings {
    display: DisplaySettings;
    data: DataSettings;
    alerts: AlertSettings;
    performance: PerformanceSettings;
    user: UserPreferences;
  }
  
  export interface DisplaySettings {
    layout: string;
    theme: string;
    showCharts: boolean;
    showNotifications: boolean;
    showPerformance: boolean;
    showWeather: boolean;
    showTerminalStatus: boolean;
    showRecentFlights: boolean;
  }
  
  export interface DataSettings {
    autoRefresh: boolean;
    refreshRate: number;
    simulationSpeed: number;
    dataSources: DataSource[];
  }
  
  export interface PerformanceSettings {
    enableHardwareAcceleration: boolean;
    enableWebGL: boolean;
    dataCacheSize: number;
    maxConcurrentRequests: number;
  }
  
  export interface UserPreferences {
    dashboardTitle: string;
    timeFormat: string;
    dateFormat: string;
    temperatureUnit: string;
    theme?: string;
    showWeather?: boolean;
    showTerminalStatus?: boolean;
    showRecentFlights?: boolean;
    enableHardwareAcceleration?: boolean;
    enableWebGL?: boolean;
    dataCacheSize?: number;
    maxConcurrentRequests?: number;
  }

 export interface AirportMetrics {
    totalFlights: number;
    activeFlights: number;
    delayedFlights: number;
    passengerCount: number;
    securityWaitTime: number;
    baggageWaitTime: number;
    gateOccupancy: number;
    weatherCondition: string;
  }
  
  export interface FlightStatus {
    id: string;
    flightNumber: string;
    airline: string;
    destination: string;
    scheduledTime: Date;
    estimatedTime: Date;
    status: 'On Time' | 'Delayed' | 'Boarding' | 'Departed' | 'Arrived';
    gate: string;
    terminal: string;
    delayMinutes?: number;
  }
  
  export interface GateStatus {
    id: string;
    gateNumber: string;
    terminal: string;
    status: 'Available' | 'Occupied' | 'Maintenance' | 'Closed';
    currentFlight?: string;
    nextFlight?: string;
    nextFlightTime?: Date;
  }
  
  export interface TerminalStatus {
    id: string;
    terminal: string;
    passengerCount: number;
    securityWaitTime: number;
    checkinWaitTime: number;
    baggageWaitTime: number;
    crowdedness: 'Low' | 'Medium' | 'High' | 'Critical';
  }
  
  export interface Resource {
    id: string;
    type: 'Staff' | 'Equipment' | 'Vehicle';
    name: string;
    location: string;
    status: 'Available' | 'In Use' | 'Maintenance';
    assignedTask?: string;
  }
  
  export interface Alert {
    id: string;
    type: 'Critical' | 'Warning' | 'Info';
    title: string;
    description: string;
    timestamp: Date;
    location: string;
    acknowledged: boolean;
    priority: number;
    terminal: string;
    estimatedResolutionTime: number;
    assignedTo: string;
    requiresAcknowledgement: boolean;
    autoEscalate: boolean;
    resolved: boolean;
    category: string;
  }
  
  export interface WeatherData {
    temperature: number;
    condition: string;
    windSpeed: number;
    windDirection: string;
    visibility: number;
    precipitation: number;
    lastUpdated: Date;
  }
  
  export interface PassengerFlow {
    timestamp: Date;
    terminal: string;
    area: string;
    passengerCount: number;
    direction: 'Incoming' | 'Outgoing';
  }

  export interface GateAnalytics {
    occupancyRate: number;
    averageTurnaroundTime: number;
    peakOccupancyHours: string[];
    mostUsedGates: string[];
    leastUsedGates: string[];
    maintenanceDowntime: number;
  }

  export interface GateAssignment {
    gateId: string;
    flightNumber?: string;
    airline?: string;
    destination?: string;
    scheduledTime?: Date;
    estimatedTime?: Date;
    status: string;
    assignToNext?: boolean;
    nextFlightNumber?: string;
    nextFlightTime?: Date;
    maintenanceReason?: string;
    maintenanceDuration?: number;
    notes?: string;
  }

  export interface BulkOperation {
    operation: string;
    gateIds: string[];
    parameters?: any;
  }

  export interface GateHistoryEntry {
    gateId: string;
    gateNumber: string;
    terminal: string;
    action: string;
    timestamp: Date;
    details: any;
    user: string;
  }

  export interface GatePerformance {
    gateId: string;
    period: string;
    utilization: number;
    averageTurnaroundTime: number;
    flightsHandled: number;
    delays: number;
    onTimePerformance: number;
  }

  // Extend existing GateStatus interface
  export interface GateStatus {
    id: string;
    gateNumber: string;
    terminal: string;
    status: 'Available' | 'Occupied' | 'Maintenance' | 'Closed';
    currentFlight?: string;
    airline?: string;
    destination?: string;
    nextFlight?: string;
    nextFlightTime?: Date;
    lastUpdated?: Date;
    turnaroundTime?: number;
    maintenanceScheduled?: boolean;
    maintenanceDuration?: number;
    maintenanceReason?: string;
  }

  export interface BulkOperationDialogData {
    gates: GateStatus[];
    operationType?: string;
  }
  
  export interface BulkOperationResult {
    saved: boolean;
    operation: string;
    parameters: any;
    gates: GateStatus[];
  }
  
  export interface BulkOperation {
    operation: string;
    gateIds: string[];
    parameters?: any;
  }
  
  export interface BulkOperationParameters {
    // Status Change
    newStatus?: string;
    
    // Maintenance
    maintenanceReason?: string;
    maintenanceDuration?: number;
    maintenanceNotes?: string;
    scheduleImmediately?: boolean;
    scheduledDateTime?: string;
    
    // Flight Assignment
    flightNumber?: string;
    airline?: string;
    destination?: string;
    scheduledTime?: string;
    estimatedTime?: string;
    flightStatus?: string;
    
    // Next Flight
    nextFlightNumber?: string;
    nextFlightTime?: string;
    
    // Common
    sendNotification?: boolean;
    notifyTeams?: string[];
    operationNotes?: string;
  }
  
  export interface OperationSummary {
    operation: string;
    gatesAffected: number;
    parameters: any;
    impact: string;
  }