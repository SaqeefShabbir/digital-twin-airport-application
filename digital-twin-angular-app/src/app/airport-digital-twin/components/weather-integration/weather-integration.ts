import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription, interval, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface WeatherData {
  timestamp: Date;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    windGust: number;
    visibility: number;
    cloudCover: number;
    condition: WeatherCondition;
    precipitation: {
      rate: number;
      type: 'RAIN' | 'SNOW' | 'SLEET' | 'HAIL' | 'NONE';
      accumulated: number;
    };
    uvIndex: number;
    dewPoint: number;
    sunrise?: Date;
    sunset?: Date;
  };
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  impact: WeatherImpact;
}

export interface WeatherForecast {
  timestamp: Date;
  period: 'HOURLY' | 'DAILY';
  temperature: {
    high: number;
    low: number;
    feelsLike: number;
  };
  condition: WeatherCondition;
  precipitation: {
    probability: number;
    amount: number;
    type: 'RAIN' | 'SNOW' | 'SLEET' | 'HAIL' | 'NONE';
  };
  wind: {
    speed: number;
    direction: number;
    gust: number;
  };
  humidity: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
}

export interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY';
  headline: string;
  description: string;
  instructions: string;
  areas: string[];
  effective: Date;
  expires: Date;
  certainty: 'OBSERVED' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY';
  urgency: 'IMMEDIATE' | 'EXPECTED' | 'FUTURE' | 'PAST';
}

export interface WeatherImpact {
  runwayConditions: RunwayCondition[];
  flightOperations: FlightOperationImpact[];
  groundOperations: GroundOperationImpact[];
  passengerImpact: PassengerImpact;
  equipmentStatus: EquipmentImpact[];
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
}

export interface RunwayCondition {
  runway: string;
  condition: 'CLEAR' | 'WET' | 'ICE' | 'SNOW' | 'SLUSH';
  friction: number;
  visibility: number;
  crosswind: number;
  tailwind: number;
  recommendation: string;
}

export interface FlightOperationImpact {
  operation: 'ARRIVAL' | 'DEPARTURE' | 'ALL';
  restriction: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CLOSED';
  reason: string;
  estimatedDelay: number;
  alternativeProcedures: string[];
}

export interface GroundOperationImpact {
  operation: 'DEICING' | 'FUELING' | 'LOADING' | 'CLEANING' | 'ALL';
  restriction: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'SUSPENDED';
  reason: string;
  estimatedDelay: number;
}

export interface PassengerImpact {
  terminalAccess: 'NORMAL' | 'DELAYED' | 'RESTRICTED';
  securityDelay: number;
  baggageDelay: number;
  transportationDelay: number;
  recommendations: string[];
}

export interface EquipmentImpact {
  equipment: string;
  status: 'OPERATIONAL' | 'LIMITED' | 'UNAVAILABLE';
  reason: string;
  estimatedRecovery: Date;
}

export type WeatherCondition = 
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'SNOW'
  | 'SLEET'
  | 'HAIL'
  | 'WINDY'
  | 'BLIZZARD';

export type WeatherAlertType = 
  | 'TORNADO'
  | 'THUNDERSTORM'
  | 'FLOOD'
  | 'WINTER_STORM'
  | 'HIGH_WIND'
  | 'HEAT'
  | 'COLD'
  | 'FOG'
  | 'VOLCANIC_ASH'
  | 'DUST_STORM'
  | 'FIRE'
  | 'TSUNAMI';

@Component({
  selector: 'app-weather-integration',
  templateUrl: './weather-integration.html',
  standalone: false,
  styleUrls: ['./weather-integration.scss'],
})
export class WeatherIntegration implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('weatherMap') weatherMap!: ElementRef;
  @ViewChild('radarCanvas') radarCanvas!: ElementRef;
  
  // Data
  weatherData: WeatherData | null = null;
  historicalData: WeatherData[] = [];
  weatherStations: WeatherStation[] = [];
  
  // Filters
  selectedTimeRange: 'CURRENT' | 'TODAY' | 'WEEK' | 'MONTH' = 'CURRENT';
  selectedView: 'DASHBOARD' | 'FORECAST' | 'RADAR' | 'ALERTS' | 'IMPACT' | 'HISTORICAL' = 'DASHBOARD';
  selectedForecastType: 'HOURLY' | 'DAILY' = 'HOURLY';
  selectedStation: string = 'AIRPORT';
  
  // Search
  searchQuery: string = '';
  private searchSubject = new BehaviorSubject<string>('');
  
  // UI State
  isLoading: boolean = false;
  autoRefresh: boolean = true;
  refreshInterval: number = 300000; // 5 minutes
  showMetrics: boolean = true;
  showMap: boolean = true;
  
  // Stats
  stats = {
    currentTemp: 0,
    feelsLike: 0,
    windSpeed: 0,
    visibility: 0,
    humidity: 0,
    precipitation: 0,
    alerts: 0,
    riskLevel: 'LOW'
  };
  
  // Units
  temperatureUnit: 'C' | 'F' = 'C';
  windSpeedUnit: 'KPH' | 'MPH' | 'KNOTS' = 'KPH';
  visibilityUnit: 'KM' | 'MI' = 'KM';
  precipitationUnit: 'MM' | 'IN' = 'MM';
  
  // Time ranges
  timeRanges = [
    { label: 'Current', value: 'CURRENT' },
    { label: 'Today', value: 'TODAY' },
    { label: '7 Days', value: 'WEEK' },
    { label: '30 Days', value: 'MONTH' }
  ];
  
  // Views
  views: Array<{
    label: string;
    value: 'DASHBOARD' | 'FORECAST' | 'RADAR' | 'ALERTS' | 'IMPACT' | 'HISTORICAL';
    icon: string;
  }> = [
    { label: 'Dashboard', value: 'DASHBOARD', icon: 'dashboard' },
    { label: 'Forecast', value: 'FORECAST', icon: 'calendar_today' },
    { label: 'Radar', value: 'RADAR', icon: 'radar' },
    { label: 'Alerts', value: 'ALERTS', icon: 'warning' },
    { label: 'Impact', value: 'IMPACT', icon: 'flight' },
    { label: 'Historical', value: 'HISTORICAL', icon: 'history' }
  ];
  
  // Weather stations
  stations = [
    { id: 'AIRPORT', name: 'Airport Control Tower', distance: 0 },
    { id: 'RWY09', name: 'Runway 09/27 East', distance: 1.2 },
    { id: 'RWY27', name: 'Runway 09/27 West', distance: 1.5 },
    { id: 'RWY18', name: 'Runway 18/36 North', distance: 2.1 },
    { id: 'TERMINAL', name: 'Terminal Complex', distance: 0.5 },
    { id: 'CARGO', name: 'Cargo Area', distance: 3.2 }
  ];
  
  // Condition icons
  conditionIcons: Record<WeatherCondition, string> = {
    'CLEAR': 'wb_sunny',
    'PARTLY_CLOUDY': 'partly_cloudy_day',
    'CLOUDY': 'cloud',
    'FOG': 'foggy',
    'DRIZZLE': 'grain',
    'RAIN': 'rainy',
    'THUNDERSTORM': 'thunderstorm',
    'SNOW': 'ac_unit',
    'SLEET': 'weather_mix',
    'HAIL': 'hail',
    'WINDY': 'air',
    'BLIZZARD': 'snowing'
  };
  
  // Condition colors
  conditionColors: Record<WeatherCondition, string> = {
    'CLEAR': '#FFD600',
    'PARTLY_CLOUDY': '#90CAF9',
    'CLOUDY': '#78909C',
    'FOG': '#BDBDBD',
    'DRIZZLE': '#29B6F6',
    'RAIN': '#1976D2',
    'THUNDERSTORM': '#7B1FA2',
    'SNOW': '#E3F2FD',
    'SLEET': '#81D4FA',
    'HAIL': '#4FC3F7',
    'WINDY': '#26C6DA',
    'BLIZZARD': '#0277BD'
  };
  
  // Alert colors
  alertColors: Record<string, string> = {
    'ADVISORY': '#2196F3',
    'WATCH': '#FF9800',
    'WARNING': '#F44336',
    'EMERGENCY': '#9C27B0'
  };
  
  // Risk colors
  riskColors: Record<string, string> = {
    'LOW': '#4CAF50',
    'MODERATE': '#FF9800',
    'HIGH': '#F44336',
    'SEVERE': '#9C27B0'
  };
  
  // Subscriptions
  private dataSubscription!: Subscription;
  private refreshSubscription!: Subscription;
  private searchSubscription!: Subscription;
  private mapSubscription!: Subscription;
  
  // Map variables
  private mapContext!: CanvasRenderingContext2D;
  private radarContext!: CanvasRenderingContext2D;
  private animationFrame: number | null = null;
  
  // Mock data
  private mockConditions: WeatherCondition[] = [
    'CLEAR', 'PARTLY_CLOUDY', 'CLOUDY', 'RAIN', 'THUNDERSTORM', 'SNOW', 'FOG', 'WINDY'
  ];
  
  private mockAlerts: WeatherAlert[] = [];
  private mockForecast: WeatherForecast[] = [];
  
  constructor() {}
  
  ngOnInit(): void {
    this.initializeSearch();
    this.loadWeatherData();
    this.loadHistoricalData();
    this.loadWeatherStations();
    this.startAutoRefresh();
  }
  
  ngAfterViewInit(): void {
    this.initializeMaps();
    this.startMapAnimation();
  }
  
  ngOnDestroy(): void {
    this.cleanupSubscriptions();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
  
  private initializeSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }
  
  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }
  
  loadWeatherData(): void {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.generateMockWeatherData();
      this.calculateStatistics();
      this.isLoading = false;
      
      // Update maps
      setTimeout(() => {
        this.updateWeatherMap();
        this.updateRadar();
      }, 100);
    }, 1200);
  }
  
  loadHistoricalData(): void {
    // Generate historical data for last 7 days
    this.historicalData = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      this.historicalData.push(this.generateHistoricalWeatherData(date));
    }
  }
  
  loadWeatherStations(): void {
    this.weatherStations = this.stations.map(station => ({
      ...station,
      temperature: 15 + Math.random() * 10 - 5,
      windSpeed: 5 + Math.random() * 20,
      windDirection: Math.random() * 360,
      humidity: 40 + Math.random() * 40,
      pressure: 1010 + Math.random() * 20 - 10,
      lastUpdate: new Date()
    }));
  }
  
  private generateMockWeatherData(): void {
    const now = new Date();
    const condition = this.mockConditions[Math.floor(Math.random() * this.mockConditions.length)];
    
    // Generate current weather
    const current: WeatherData['current'] = {
      temperature: 15 + Math.random() * 15 - 7.5,
      feelsLike: 15 + Math.random() * 15 - 7.5,
      humidity: 40 + Math.random() * 50,
      pressure: 1010 + Math.random() * 20 - 10,
      windSpeed: 5 + Math.random() * 25,
      windDirection: Math.random() * 360,
      windGust: 5 + Math.random() * 35,
      visibility: 5 + Math.random() * 15,
      cloudCover: condition === 'CLEAR' ? 10 : condition === 'PARTLY_CLOUDY' ? 40 : condition === 'CLOUDY' ? 80 : 100,
      condition,
      precipitation: {
        rate: condition.includes('RAIN') ? Math.random() * 10 : condition.includes('SNOW') ? Math.random() * 5 : 0,
        type: condition.includes('RAIN') ? 'RAIN' : condition.includes('SNOW') ? 'SNOW' : 'NONE',
        accumulated: condition.includes('RAIN') ? Math.random() * 20 : condition.includes('SNOW') ? Math.random() * 10 : 0
      },
      uvIndex: Math.floor(Math.random() * 11),
      dewPoint: 5 + Math.random() * 10,
      sunrise: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 30),
      sunset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 45)
    };
    
    // Generate forecast
    this.generateMockForecast(condition);
    
    // Generate alerts
    this.generateMockAlerts();
    
    // Generate impact
    const impact = this.generateMockImpact(current);
    
    this.weatherData = {
      timestamp: now,
      location: 'International Airport',
      coordinates: { latitude: 40.6413, longitude: -73.7781 },
      current,
      forecast: this.mockForecast,
      alerts: this.mockAlerts,
      impact
    };
  }
  
  private generateHistoricalWeatherData(date: Date): WeatherData {
    const condition = this.mockConditions[Math.floor(Math.random() * this.mockConditions.length)];
    
    return {
      timestamp: date,
      location: 'International Airport',
      coordinates: { latitude: 40.6413, longitude: -73.7781 },
      current: {
        temperature: 15 + Math.random() * 15 - 7.5,
        feelsLike: 15 + Math.random() * 15 - 7.5,
        humidity: 40 + Math.random() * 50,
        pressure: 1010 + Math.random() * 20 - 10,
        windSpeed: 5 + Math.random() * 25,
        windDirection: Math.random() * 360,
        windGust: 5 + Math.random() * 35,
        visibility: 5 + Math.random() * 15,
        cloudCover: condition === 'CLEAR' ? 10 : condition === 'PARTLY_CLOUDY' ? 40 : condition === 'CLOUDY' ? 80 : 100,
        condition,
        precipitation: {
          rate: condition.includes('RAIN') ? Math.random() * 10 : condition.includes('SNOW') ? Math.random() * 5 : 0,
          type: condition.includes('RAIN') ? 'RAIN' : condition.includes('SNOW') ? 'SNOW' : 'NONE',
          accumulated: condition.includes('RAIN') ? Math.random() * 20 : condition.includes('SNOW') ? Math.random() * 10 : 0
        },
        uvIndex: Math.floor(Math.random() * 11),
        dewPoint: 5 + Math.random() * 10
      },
      forecast: [],
      alerts: [],
      impact: this.generateMockImpact({
        temperature: 15,
        feelsLike: 15,
        humidity: 50,
        pressure: 1010,
        windSpeed: 10,
        windDirection: 180,
        windGust: 15,
        visibility: 10,
        cloudCover: 50,
        condition: 'CLEAR',
        precipitation: { rate: 0, type: 'NONE', accumulated: 0 },
        uvIndex: 5,
        dewPoint: 10
      })
    };
  }
  
  private generateMockForecast(currentCondition: WeatherCondition): void {
    this.mockForecast = [];
    const now = new Date();
    
    // Generate hourly forecast (24 hours)
    for (let i = 0; i < 24; i++) {
      const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
      const tempVariation = Math.sin(i * Math.PI / 12) * 5;
      
      this.mockForecast.push({
        timestamp: hour,
        period: 'HOURLY',
        temperature: {
          high: 15 + tempVariation + Math.random() * 3,
          low: 10 + tempVariation - Math.random() * 3,
          feelsLike: 15 + tempVariation + Math.random() * 2
        },
        condition: this.mockConditions[Math.floor(Math.random() * this.mockConditions.length)],
        precipitation: {
          probability: Math.random() * 0.5,
          amount: Math.random() * 5,
          type: Math.random() > 0.7 ? 'RAIN' : 'NONE'
        },
        wind: {
          speed: 5 + Math.random() * 20,
          direction: Math.random() * 360,
          gust: 5 + Math.random() * 25
        },
        humidity: 40 + Math.random() * 40,
        cloudCover: 20 + Math.random() * 80,
        visibility: 5 + Math.random() * 15,
        uvIndex: Math.floor(Math.random() * 11)
      });
    }
    
    // Generate daily forecast (7 days)
    for (let i = 0; i < 7; i++) {
      const day = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      
      this.mockForecast.push({
        timestamp: day,
        period: 'DAILY',
        temperature: {
          high: 15 + Math.random() * 10,
          low: 10 + Math.random() * 5,
          feelsLike: 15 + Math.random() * 8
        },
        condition: this.mockConditions[Math.floor(Math.random() * this.mockConditions.length)],
        precipitation: {
          probability: Math.random() * 0.7,
          amount: Math.random() * 15,
          type: Math.random() > 0.5 ? 'RAIN' : 'NONE'
        },
        wind: {
          speed: 5 + Math.random() * 25,
          direction: Math.random() * 360,
          gust: 5 + Math.random() * 30
        },
        humidity: 40 + Math.random() * 50,
        cloudCover: 30 + Math.random() * 70,
        visibility: 5 + Math.random() * 20,
        uvIndex: Math.floor(Math.random() * 11)
      });
    }
  }
  
  private generateMockAlerts(): void {
    this.mockAlerts = [];
    const now = new Date();
    
    // Randomly generate some alerts
    if (Math.random() > 0.5) {
      this.mockAlerts.push({
        id: 'ALERT001',
        type: 'THUNDERSTORM',
        severity: 'WARNING',
        headline: 'Severe Thunderstorm Warning',
        description: 'Severe thunderstorms expected in the area with possible hail and damaging winds.',
        instructions: 'Take shelter immediately. Delay outdoor activities.',
        areas: ['Airport', 'Eastern Suburbs'],
        effective: new Date(now.getTime() - 30 * 60000),
        expires: new Date(now.getTime() + 2 * 60 * 60000),
        certainty: 'LIKELY',
        urgency: 'EXPECTED'
      });
    }
    
    if (Math.random() > 0.7) {
      this.mockAlerts.push({
        id: 'ALERT002',
        type: 'HIGH_WIND',
        severity: 'ADVISORY',
        headline: 'High Wind Advisory',
        description: 'Sustained winds of 35-45 mph with gusts up to 60 mph expected.',
        instructions: 'Secure loose objects. Use caution when driving high-profile vehicles.',
        areas: ['Airport', 'Northern Regions'],
        effective: new Date(now.getTime() - 60 * 60000),
        expires: new Date(now.getTime() + 6 * 60 * 60000),
        certainty: 'POSSIBLE',
        urgency: 'FUTURE'
      });
    }
    
    if (Math.random() > 0.8) {
      this.mockAlerts.push({
        id: 'ALERT003',
        type: 'FOG',
        severity: 'WATCH',
        headline: 'Dense Fog Watch',
        description: 'Reduced visibility expected overnight and early morning.',
        instructions: 'Allow extra travel time. Use low beam headlights.',
        areas: ['Airport', 'Terminal Area'],
        effective: new Date(now.getTime()),
        expires: new Date(now.getTime() + 8 * 60 * 60000),
        certainty: 'LIKELY',
        urgency: 'EXPECTED'
      });
    }
  }
  
  private generateMockImpact(current: WeatherData['current']): WeatherImpact {
    const runwayConditions: RunwayCondition[] = [
      {
        runway: '13L/31R',
        condition: current.condition === 'RAIN' ? 'WET' : 
                   current.condition === 'SNOW' ? 'SNOW' : 
                   current.condition === 'FOG' ? 'CLEAR' : 'CLEAR',
        friction: current.condition === 'RAIN' ? 0.6 : 
                  current.condition === 'SNOW' ? 0.3 : 0.8,
        visibility: current.visibility,
        crosswind: Math.abs(Math.sin(current.windDirection * Math.PI / 180) * current.windSpeed),
        tailwind: Math.abs(Math.cos(current.windDirection * Math.PI / 180) * current.windSpeed),
        recommendation: current.condition === 'RAIN' ? 'Increase landing distance' : 
                        current.condition === 'SNOW' ? 'Deicing required' : 'Normal operations'
      },
      {
        runway: '09/27',
        condition: current.condition === 'RAIN' ? 'WET' : 
                   current.condition === 'SNOW' ? 'SNOW' : 
                   current.condition === 'FOG' ? 'CLEAR' : 'CLEAR',
        friction: current.condition === 'RAIN' ? 0.7 : 
                  current.condition === 'SNOW' ? 0.4 : 0.85,
        visibility: current.visibility * 0.9,
        crosswind: Math.abs(Math.sin((current.windDirection - 90) * Math.PI / 180) * current.windSpeed),
        tailwind: Math.abs(Math.cos((current.windDirection - 90) * Math.PI / 180) * current.windSpeed),
        recommendation: current.windSpeed > 20 ? 'Crosswind caution' : 'Normal operations'
      }
    ];
    
    const flightOperations: FlightOperationImpact[] = [
      {
        operation: 'ARRIVAL',
        restriction: current.visibility < 5 ? 'MODERATE' : 
                     current.windSpeed > 30 ? 'MINOR' : 'NONE',
        reason: current.visibility < 5 ? 'Reduced visibility' : 
                current.windSpeed > 30 ? 'High winds' : 'Normal conditions',
        estimatedDelay: current.visibility < 5 ? 15 : 
                        current.windSpeed > 30 ? 10 : 0,
        alternativeProcedures: current.visibility < 5 ? ['Use ILS', 'Increase separation'] : []
      },
      {
        operation: 'DEPARTURE',
        restriction: current.condition === 'THUNDERSTORM' ? 'MAJOR' : 
                     current.windSpeed > 35 ? 'MODERATE' : 'NONE',
        reason: current.condition === 'THUNDERSTORM' ? 'Lightning in area' : 
                current.windSpeed > 35 ? 'High winds' : 'Normal conditions',
        estimatedDelay: current.condition === 'THUNDERSTORM' ? 30 : 
                        current.windSpeed > 35 ? 15 : 0,
        alternativeProcedures: current.condition === 'THUNDERSTORM' ? ['Hold at gate', 'Use different runway'] : []
      }
    ];
    
    const groundOperations: GroundOperationImpact[] = [
      {
        operation: 'DEICING',
        restriction: current.temperature < 2 ? 'NONE' : 'SUSPENDED',
        reason: current.temperature < 2 ? 'Required' : 'Above freezing',
        estimatedDelay: 0
      },
      {
        operation: 'FUELING',
        restriction: current.condition === 'THUNDERSTORM' ? 'MAJOR' : 'NONE',
        reason: current.condition === 'THUNDERSTORM' ? 'Lightning safety' : 'Normal operations',
        estimatedDelay: current.condition === 'THUNDERSTORM' ? 20 : 0
      }
    ];
    
    const passengerImpact: PassengerImpact = {
      terminalAccess: current.condition === 'BLIZZARD' ? 'RESTRICTED' : 'NORMAL',
      securityDelay: current.condition === 'FOG' ? 5 : 0,
      baggageDelay: current.condition === 'RAIN' ? 10 : 0,
      transportationDelay: current.condition === 'SNOW' ? 15 : 0,
      recommendations: current.condition === 'SNOW' ? ['Allow extra time', 'Check flight status'] : []
    };
    
    const equipmentStatus: EquipmentImpact[] = [
      {
        equipment: 'Deicing Trucks',
        status: current.temperature < 2 ? 'OPERATIONAL' : 'LIMITED',
        reason: current.temperature < 2 ? 'Active duty' : 'Standby',
        estimatedRecovery: new Date()
      },
      {
        equipment: 'Ground Power Units',
        status: 'OPERATIONAL',
        reason: 'Normal operations',
        estimatedRecovery: new Date()
      }
    ];
    
    const overallRisk = current.condition === 'THUNDERSTORM' ? 'HIGH' :
                       current.condition === 'BLIZZARD' ? 'SEVERE' :
                       current.visibility < 3 ? 'MODERATE' :
                       current.windSpeed > 40 ? 'MODERATE' : 'LOW';
    
    return {
      runwayConditions,
      flightOperations,
      groundOperations,
      passengerImpact,
      equipmentStatus,
      overallRisk
    };
  }
  
  calculateStatistics(): void {
    if (!this.weatherData) return;
    
    const { current, alerts, impact } = this.weatherData;
    
    this.stats = {
      currentTemp: current.temperature,
      feelsLike: current.feelsLike,
      windSpeed: current.windSpeed,
      visibility: current.visibility,
      humidity: current.humidity,
      precipitation: current.precipitation.rate,
      alerts: alerts.length,
      riskLevel: impact.overallRisk
    };
  }
  
  private startAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        if (!this.isLoading) {
          this.updateWeatherData();
        }
      });
    }
  }
  
  private updateWeatherData(): void {
    // Update weather stations
    this.weatherStations.forEach(station => {
      station.temperature += (Math.random() - 0.5) * 2;
      station.windSpeed += (Math.random() - 0.5) * 5;
      station.windDirection = (station.windDirection + Math.random() * 20 - 10) % 360;
      station.lastUpdate = new Date();
    });
    
    // Update radar
    this.updateRadar();
  }
  
  applyFilters(): void {
    // Filtering logic would be applied here
    this.calculateStatistics();
  }
  
  setView(view: 'DASHBOARD' | 'FORECAST' | 'RADAR' | 'ALERTS' | 'IMPACT' | 'HISTORICAL'): void {
    this.selectedView = view;
    
    // Update visualizations based on view
    setTimeout(() => {
      if (view === 'RADAR') {
        this.updateRadar();
      } else if (view === 'DASHBOARD' && this.showMap) {
        this.updateWeatherMap();
      }
    }, 100);
  }
  
  toggleMetrics(): void {
    this.showMetrics = !this.showMetrics;
  }
  
  toggleMap(): void {
    this.showMap = !this.showMap;
    if (this.showMap) {
      setTimeout(() => this.updateWeatherMap(), 100);
    }
  }
  
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.refreshSubscription?.unsubscribe();
    }
  }
  
  changeUnits(unitType: string, unit: string): void {
    switch (unitType) {
      case 'temperature':
        this.temperatureUnit = unit as 'C' | 'F';
        break;
      case 'wind':
        this.windSpeedUnit = unit as 'KPH' | 'MPH' | 'KNOTS';
        break;
      case 'visibility':
        this.visibilityUnit = unit as 'KM' | 'MI';
        break;
      case 'precipitation':
        this.precipitationUnit = unit as 'MM' | 'IN';
        break;
    }
  }
  
  convertTemperature(celsius: number): number {
    return this.temperatureUnit === 'F' ? (celsius * 9/5) + 32 : celsius;
  }
  
  convertWindSpeed(kph: number): number {
    switch (this.windSpeedUnit) {
      case 'MPH': return kph * 0.621371;
      case 'KNOTS': return kph * 0.539957;
      default: return kph;
    }
  }
  
  convertVisibility(km: number): number {
    return this.visibilityUnit === 'MI' ? km * 0.621371 : km;
  }
  
  convertPrecipitation(mm: number): number {
    return this.precipitationUnit === 'IN' ? mm * 0.0393701 : mm;
  }
  
  getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((degrees % 360) / 22.5);
    return directions[index % 16];
  }
  
  getConditionIcon(condition: WeatherCondition): string {
    return this.conditionIcons[condition] || 'help';
  }
  
  getConditionColor(condition: WeatherCondition): string {
    return this.conditionColors[condition] || '#757575';
  }
  
  getAlertColor(severity: string): string {
    return this.alertColors[severity] || '#757575';
  }
  
  getRiskColor(risk: string): string {
    return this.riskColors[risk] || '#757575';
  }
  
  getRiskClass(risk: string): string {
    return `risk-${risk.toLowerCase()}`;
  }
  
  getImpactClass(impact: string): string {
    return `impact-${impact.toLowerCase()}`;
  }
  
  refreshData(): void {
    this.isLoading = true;
    this.loadWeatherData();
    this.loadHistoricalData();
    this.loadWeatherStations();
  }
  
  exportReport(): void {
    // Implement export functionality
    console.log('Exporting weather report...');
  }
  
  // Map Methods
  private initializeMaps(): void {
    if (this.weatherMap) {
      const canvas = this.weatherMap.nativeElement;
      this.mapContext = canvas.getContext('2d');
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = 400;
    }
    
    if (this.radarCanvas) {
      const canvas = this.radarCanvas.nativeElement;
      this.radarContext = canvas.getContext('2d');
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = 500;
    }
  }
  
  private startMapAnimation(): void {
    const animate = () => {
      if (this.selectedView === 'RADAR') {
        this.updateRadar();
      }
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    if (this.autoRefresh) {
      animate();
    }
  }
  
  private updateWeatherMap(): void {
    if (!this.mapContext || !this.weatherData) return;
    
    const canvas = this.weatherMap.nativeElement;
    const ctx = this.mapContext;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#1A237E';
    ctx.fillRect(0, 0, width, height);
    
    // Draw airport layout
    this.drawAirportLayout(ctx, width, height);
    
    // Draw weather conditions
    this.drawWeatherConditions(ctx, width, height);
    
    // Draw weather stations
    this.drawWeatherStations(ctx, width, height);
    
    // Draw legend
    this.drawMapLegend(ctx, width, height);
  }
  
  private drawAirportLayout(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Draw runways
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height * 0.5);
    ctx.lineTo(width * 0.8, height * 0.5);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.3);
    ctx.lineTo(width * 0.5, height * 0.7);
    ctx.stroke();
    
    // Draw terminals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(width * 0.4, height * 0.6, width * 0.2, height * 0.15);
    
    // Draw control tower
    ctx.fillStyle = '#FFD600';
    ctx.fillRect(width * 0.48, height * 0.45, width * 0.04, height * 0.1);
    
    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Control Tower', width * 0.5, height * 0.42);
    ctx.fillText('Terminal', width * 0.5, height * 0.78);
    ctx.fillText('Runway 13L/31R', width * 0.5, height * 0.53);
    ctx.fillText('Runway 09/27', width * 0.55, height * 0.5);
  }
  
  private drawWeatherConditions(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.weatherData) return;
    
    const condition = this.weatherData.current.condition;
    const color = this.getConditionColor(condition);
    
    // Draw weather effect based on condition
    ctx.globalAlpha = 0.6;
    
    if (condition === 'RAIN') {
      this.drawRain(ctx, width, height);
    } else if (condition === 'SNOW') {
      this.drawSnow(ctx, width, height);
    } else if (condition === 'FOG') {
      this.drawFog(ctx, width, height);
    } else if (condition === 'CLOUDY') {
      this.drawClouds(ctx, width, height);
    }
    
    ctx.globalAlpha = 1.0;
    
    // Draw wind direction
    this.drawWindDirection(ctx, width, height);
  }
  
  private drawRain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.7)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const length = 10 + Math.random() * 20;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + length);
      ctx.stroke();
    }
  }
  
  private drawSnow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 2 + Math.random() * 3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  private drawFog(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(189, 189, 189, 0.1)');
    gradient.addColorStop(0.5, 'rgba(189, 189, 189, 0.3)');
    gradient.addColorStop(1, 'rgba(189, 189, 189, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.3, width, height * 0.4);
  }
  
  private drawClouds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    // Draw cloud shapes
    const clouds = [
      { x: width * 0.2, y: height * 0.2, size: 40 },
      { x: width * 0.5, y: height * 0.3, size: 60 },
      { x: width * 0.7, y: height * 0.25, size: 50 }
    ];
    
    clouds.forEach(cloud => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.6, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.6, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  private drawWindDirection(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.weatherData) return;
    
    const windDir = this.weatherData.current.windDirection;
    const windSpeed = this.weatherData.current.windSpeed;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const radius = 50;
    
    // Draw compass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw cardinal directions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ['N', 'E', 'S', 'W'].forEach((dir, i) => {
      const angle = i * Math.PI / 2;
      const x = centerX + Math.sin(angle) * (radius + 15);
      const y = centerY - Math.cos(angle) * (radius + 15);
      ctx.fillText(dir, x, y);
    });
    
    // Draw wind arrow
    const arrowAngle = (windDir - 90) * Math.PI / 180;
    const arrowLength = radius * (windSpeed / 40);
    
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(arrowAngle) * arrowLength,
      centerY + Math.sin(arrowAngle) * arrowLength
    );
    ctx.stroke();
    
    // Draw arrowhead
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.moveTo(
      centerX + Math.cos(arrowAngle) * arrowLength,
      centerY + Math.sin(arrowAngle) * arrowLength
    );
    ctx.lineTo(
      centerX + Math.cos(arrowAngle + Math.PI/6) * 10,
      centerY + Math.sin(arrowAngle + Math.PI/6) * 10
    );
    ctx.lineTo(
      centerX + Math.cos(arrowAngle - Math.PI/6) * 10,
      centerY + Math.sin(arrowAngle - Math.PI/6) * 10
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw wind speed label
    ctx.fillStyle = '#FF9800';
    ctx.fillText(
      `${windSpeed.toFixed(0)} ${this.windSpeedUnit}`,
      centerX,
      centerY + radius + 30
    );
  }
  
  private drawWeatherStations(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const stations = [
      { x: width * 0.48, y: height * 0.5, name: 'Control', temp: this.weatherData?.current.temperature || 20 },
      { x: width * 0.2, y: height * 0.5, name: 'RWY09', temp: 20 },
      { x: width * 0.8, y: height * 0.5, name: 'RWY27', temp: 19 },
      { x: width * 0.5, y: height * 0.3, name: 'RWY18', temp: 18 },
      { x: width * 0.5, y: height * 0.65, name: 'Terminal', temp: 21 },
      { x: width * 0.9, y: height * 0.7, name: 'Cargo', temp: 19 }
    ];
    
    stations.forEach(station => {
      // Draw station dot
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(station.x, station.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw temperature
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${this.convertTemperature(station.temp).toFixed(0)}°${this.temperatureUnit}`,
        station.x,
        station.y - 12
      );
    });
  }
  
  private drawMapLegend(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const legendX = width - 150;
    const legendY = 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX, legendY, 130, 100);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Weather Stations', legendX + 10, legendY + 20);
    
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(legendX + 15, legendY + 35, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.fillText('Station', legendX + 30, legendY + 38);
    
    if (this.weatherData) {
      ctx.fillStyle = this.getConditionColor(this.weatherData.current.condition);
      ctx.font = 'bold 12px Arial';
      ctx.fillText(
        this.weatherData.current.condition.replace('_', ' '),
        legendX + 10,
        legendY + 60
      );
      
      ctx.font = '10px Arial';
      ctx.fillText(
        `Updated: ${this.weatherData.timestamp.toLocaleTimeString()}`,
        legendX + 10,
        legendY + 80
      );
    }
  }
  
  private updateRadar(): void {
    if (!this.radarContext || this.selectedView !== 'RADAR') return;
    
    const canvas = this.radarCanvas.nativeElement;
    const ctx = this.radarContext;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    const now = Date.now();
    
    // Clear canvas with gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#0D47A1');
    gradient.addColorStop(1, '#1A237E');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw radar circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * i / 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw cardinal directions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach((dir, i) => {
      const angle = i * Math.PI / 4;
      const x = centerX + Math.sin(angle) * (radius + 20);
      const y = centerY - Math.cos(angle) * (radius + 20);
      ctx.fillText(dir, x, y);
    });
    
    // Draw distance rings
    for (let i = 1; i <= 5; i++) {
      ctx.fillText(
        `${i * 20} ${this.visibilityUnit}`,
        centerX,
        centerY - radius * i / 5 - 10
      );
    }
    
    // Draw rotating radar beam
    const beamAngle = (now / 20) % (Math.PI * 2);
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.sin(beamAngle) * radius,
      centerY - Math.cos(beamAngle) * radius
    );
    ctx.stroke();
    
    // Draw precipitation returns
    ctx.fillStyle = 'rgba(33, 150, 243, 0.6)';
    const numReturns = 50 + Math.sin(now / 1000) * 20;
    
    for (let i = 0; i < numReturns; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const intensity = 0.3 + Math.random() * 0.7;
      const size = 2 + intensity * 4;
      
      const x = centerX + Math.sin(angle) * distance;
      const y = centerY - Math.cos(angle) * distance;
      
      ctx.globalAlpha = intensity;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    
    // Draw airport location
    ctx.fillStyle = '#FFD600';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('AIRPORT', centerX, centerY + 25);
    
    // Draw legend
    this.drawRadarLegend(ctx, width, height);
  }
  
  private drawRadarLegend(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const legendX = 20;
    const legendY = height - 120;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX, legendY, 150, 100);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Radar Intensity', legendX + 10, legendY + 20);
    
    const intensities = [
      { label: 'Light', color: 'rgba(33, 150, 243, 0.3)' },
      { label: 'Moderate', color: 'rgba(33, 150, 243, 0.6)' },
      { label: 'Heavy', color: 'rgba(33, 150, 243, 0.9)' }
    ];
    
    intensities.forEach((intensity, i) => {
      ctx.fillStyle = intensity.color;
      ctx.fillRect(legendX + 10, legendY + 30 + i * 20, 20, 12);
      
      ctx.fillStyle = 'white';
      ctx.fillText(intensity.label, legendX + 40, legendY + 40 + i * 20);
    });
    
    // Draw update time
    ctx.fillText(
      `Update: ${new Date().toLocaleTimeString()}`,
      legendX + 10,
      legendY + 90
    );
  }
  
  private cleanupSubscriptions(): void {
    this.dataSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.mapSubscription?.unsubscribe();
  }
}

interface WeatherStation {
  id: string;
  name: string;
  distance: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  pressure: number;
  lastUpdate: Date;
}
