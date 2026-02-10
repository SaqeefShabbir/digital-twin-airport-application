import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { FormsModule } from '@angular/forms';

// Analytics data interfaces
export interface AirportMetric {
  name: string;
  value: number;
  change: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface FlightData {
  time: string;
  arrivals: number;
  departures: number;
  delays: number;
}

export interface PassengerFlow {
  terminal: string;
  current: number;
  capacity: number;
  trend: number[];
}

export interface WeatherData {
  temperature: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'fog';
  windSpeed: number;
  visibility: number;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  standalone: false,
  styleUrls: ['./analytics.scss'],
})
export class Analytics implements OnInit, OnDestroy {
  // Time period options
  timePeriods = ['Real-time', 'Today', 'Week', 'Month', 'Quarter'];
  selectedPeriod = 'Today';
  
  // KPI Metrics
  airportMetrics: AirportMetric[] = [
    { name: 'Total Flights', value: 342, change: 12.5, unit: '', trend: 'up' },
    { name: 'On-Time Performance', value: 86.4, change: 2.1, unit: '%', trend: 'up' },
    { name: 'Passenger Volume', value: 45820, change: 8.7, unit: '', trend: 'up' },
    { name: 'Baggage Handling', value: 99.2, change: 0.3, unit: '%', trend: 'stable' },
    { name: 'Security Wait Time', value: 8.5, change: -1.2, unit: 'min', trend: 'down' },
    { name: 'Carbon Emissions', value: 1245, change: -3.4, unit: 'tons', trend: 'down' }
  ];
  
  // Flight operations data
  flightOperations = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    arrivals: [12, 8, 25, 32, 28, 18],
    departures: [10, 6, 28, 30, 26, 15],
    delays: [2, 1, 4, 3, 5, 2]
  };
  
  // Passenger flow by terminal
  passengerFlow: PassengerFlow[] = [
    { terminal: 'Terminal A', current: 12500, capacity: 18000, trend: [11000, 11500, 12000, 12500] },
    { terminal: 'Terminal B', current: 9800, capacity: 15000, trend: [9000, 9200, 9500, 9800] },
    { terminal: 'Terminal C', current: 15200, capacity: 20000, trend: [14000, 14500, 14800, 15200] },
    { terminal: 'International', current: 8320, capacity: 12000, trend: [7800, 8000, 8200, 8320] }
  ];
  
  // Resource utilization
  resourceUtilization = {
    labels: ['Gates', 'Check-in', 'Security', 'Baggage', 'Parking', 'Retail'],
    utilization: [85, 72, 68, 90, 78, 65]
  };
  
  // Weather data
  weather: WeatherData = {
    temperature: 22,
    condition: 'clear',
    windSpeed: 12,
    visibility: 10
  };
  
  // Charts references
  private flightChart: any;
  private passengerChart: any;
  private resourceChart: any;
  
  // Alert notifications
  alerts = [
    { id: 1, type: 'warning', message: 'Security queue at Terminal B exceeding 15 minutes', time: '10:25' },
    { id: 2, type: 'info', message: 'Baggage system maintenance scheduled for 02:00-04:00', time: '09:45' },
    { id: 3, type: 'success', message: 'All flights currently operating on schedule', time: '08:30' }
  ];
  
  // Filter options
  filterOptions = {
    terminal: 'All',
    airline: 'All',
    flightType: 'All'
  };
  
  // Simulated real-time updates
  private updateInterval: any;
  
  // Math reference for template
  Math = Math;
  
  constructor() {
    Chart.register(...registerables);
  }
  
  ngOnInit(): void {
    this.initializeCharts();
    this.startRealTimeUpdates();
  }
  
  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.flightChart) {
      this.flightChart.destroy();
    }
    if (this.passengerChart) {
      this.passengerChart.destroy();
    }
    if (this.resourceChart) {
      this.resourceChart.destroy();
    }
  }
  
  // Helper methods for template calculations
  getPassengerCapacityPercentage(): string {
    const totalCurrent = this.passengerFlow.reduce((sum, p) => sum + p.current, 0);
    const totalCapacity = this.passengerFlow.reduce((sum, p) => sum + p.capacity, 0);
    const percentage = (totalCurrent / totalCapacity) * 100;
    return percentage.toFixed(1);
  }
  
  getOnTimePerformance(): number {
    const performanceMetric = this.airportMetrics.find(metric => metric.name === 'On-Time Performance');
    return performanceMetric ? performanceMetric.value : 0;
  }
  
  getTotalFlights(): number {
    const flightsMetric = this.airportMetrics.find(metric => metric.name === 'Total Flights');
    return flightsMetric ? flightsMetric.value : 0;
  }
  
  getSecurityTrend(): number {
    const securityMetric = this.airportMetrics.find(metric => metric.name === 'Security Wait Time');
    return securityMetric ? securityMetric.change : 0;
  }
  
  getSecurityTrendText(): string {
    const trend = this.getSecurityTrend();
    return trend > 0 ? 'increased' : trend < 0 ? 'decreased' : 'remained stable';
  }
  
  getAbsoluteSecurityChange(): number {
    return Math.abs(this.getSecurityTrend());
  }
  
  initializeCharts(): void {
    // Flight Operations Chart
    this.flightChart = new Chart('flightChart', {
      type: 'line',
      data: {
        labels: this.flightOperations.labels,
        datasets: [
          {
            label: 'Arrivals',
            data: this.flightOperations.arrivals,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Departures',
            data: this.flightOperations.departures,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Delays',
            data: this.flightOperations.delays,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Flights'
            }
          }
        }
      }
    });
    
    // Passenger Flow Chart
    this.passengerChart = new Chart('passengerChart', {
      type: 'bar',
      data: {
        labels: this.passengerFlow.map(p => p.terminal),
        datasets: [
          {
            label: 'Current Passengers',
            data: this.passengerFlow.map(p => p.current),
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Capacity',
            data: this.passengerFlow.map(p => p.capacity),
            backgroundColor: 'rgba(255, 99, 132, 0.3)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            type: 'line',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Passengers'
            }
          }
        }
      }
    });
    
    // Resource Utilization Chart
    this.resourceChart = new Chart('resourceChart', {
      type: 'radar',
      data: {
        labels: this.resourceUtilization.labels,
        datasets: [{
          label: 'Utilization %',
          data: this.resourceUtilization.utilization,
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: 'rgba(255, 159, 64, 1)',
          pointBackgroundColor: 'rgba(255, 159, 64, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 159, 64, 1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    });
  }
  
  startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      if (this.selectedPeriod === 'Real-time') {
        this.updateRealTimeData();
      }
    }, 5000); // Update every 5 seconds
  }
  
  updateRealTimeData(): void {
    // Simulate real-time data updates
    this.airportMetrics.forEach(metric => {
      const change = Math.random() * 2 - 1; // Random change between -1 and 1
      metric.value = parseFloat((metric.value + change).toFixed(1));
    });
    
    // Update flight operations data
    const lastIndex = this.flightOperations.arrivals.length - 1;
    this.flightOperations.arrivals[lastIndex] += Math.floor(Math.random() * 3) - 1;
    this.flightOperations.departures[lastIndex] += Math.floor(Math.random() * 3) - 1;
    this.flightOperations.delays[lastIndex] += Math.floor(Math.random() * 2) - 0;
    
    // Update charts
    this.flightChart.update();
    this.passengerChart.update();
    this.resourceChart.update();
  }
  
  onTimePeriodChange(period: string): void {
    this.selectedPeriod = period;
    // In a real application, you would fetch new data based on the selected period
    console.log(`Time period changed to: ${period}`);
  }
  
  onFilterChange(): void {
    // Handle filter changes
    console.log('Filters updated:', this.filterOptions);
  }
  
  exportData(): void {
    // Implement data export functionality
    console.log('Exporting analytics data...');
  }
  
  getWeatherIcon(condition: string): string {
    switch(condition) {
      case 'clear': return 'wb_sunny';
      case 'cloudy': return 'cloud';
      case 'rain': return 'umbrella';
      case 'fog': return 'cloud_queue';
      default: return 'help_outline';
    }
  }
  
  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch(trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return 'remove';
    }
  }
  
  getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    switch(trend) {
      case 'up': return 'success';
      case 'down': return 'error';
      case 'stable': return 'warning';
      default: return '';
    }
  }
}