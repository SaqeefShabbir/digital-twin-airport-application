import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AirportDataService } from '../../services/airport-data.service';
import { TerminalService } from '../../services/terminal.service';
import { TerminalStatus, GateStatus, FlightStatus } from '../../models/airport-models';
import { TerminalDetailDialog } from '../terminal-detail-dialog/terminal-detail-dialog';
import { GateAssignmentDialog } from '../gate-assignment-dialog/gate-assignment-dialog';

@Component({
  selector: 'app-terminal-view',
  templateUrl: './terminal-view.html',
  standalone: false,
  styleUrls: ['./terminal-view.scss']
})
export class TerminalView implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminalCanvas') terminalCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  // Data
  terminals: TerminalStatus[] = [];
  gates: GateStatus[] = [];
  activeFlights: FlightStatus[] = [];
  
  // View states
  selectedTerminal: string = 'all';
  viewMode: 'overview' | 'detailed' | '3d' = 'overview';
  showWaitTimes = true;
  showPassengerFlow = true;
  showGateStatus = true;
  autoRefresh = true;
  
  // Filter form
  filterForm: FormGroup;
  
  // Visualization
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number = 0;
  private isCanvasInitialized = false;
  
  // Terminal dimensions
  terminalDimensions = {
    width: 1200,
    height: 600,
    padding: 40,
    gateWidth: 60,
    gateHeight: 80,
    gateSpacing: 20
  };
  
  // Simulation
  simulationTime = 0;
  passengerDensity = 0.7;
  highlightGate: string | null = null;
  
  // Subscriptions
  private dataSubscription!: Subscription;
  private refreshSubscription!: Subscription;
  private simulationSubscription!: Subscription;
  private formSubscription!: Subscription;
  
  constructor(
    private airportDataService: AirportDataService,
    private terminalService: TerminalService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      terminal: ['all'],
      crowdedness: ['all'],
      waitTime: [0],
      passengerCount: [0]
    });
  }
  
  ngOnInit(): void {
    this.loadTerminalData();
    this.setupAutoRefresh();
    this.setupFormListeners();
  }
  
  ngAfterViewInit(): void {
    this.initCanvas();
    this.startVisualization();
  }
  
  loadTerminalData(): void {
    this.airportDataService.getTerminalStatus().subscribe({
      next: (terminals) => {
        this.terminals = terminals;
      },
      error: (error) => {
        console.error('Error loading terminal data:', error);
        this.snackBar.open('Failed to load terminal data', 'Close', { duration: 3000 });
      }
    });
    
    this.airportDataService.getGateStatus().subscribe({
      next: (gates) => {
        this.gates = gates;
      },
      error: (error) => {
        console.error('Error loading gate data:', error);
        this.snackBar.open('Failed to load gate data', 'Close', { duration: 3000 });
      }
    });
    
    this.airportDataService.getFlightStatus().subscribe({
      next: (flights) => {
        this.activeFlights = flights.filter(flight => 
          flight.status === 'Boarding' || flight.status === 'On Time'
        );
      },
      error: (error) => {
        console.error('Error loading flight data:', error);
        this.snackBar.open('Failed to load flight data', 'Close', { duration: 3000 });
      }
    });
  }
  
  setupAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(10000).subscribe(() => {
        this.loadTerminalData();
      });
    }
    
    // Simulation animation
    this.simulationSubscription = timer(0, 100).subscribe(() => {
      this.simulationTime += 0.01;
    });
  }
  
  setupFormListeners(): void {
    this.formSubscription = this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(filters => {
        this.applyFilters(filters);
      });
  }
  
  initCanvas(): void {
    if (!this.terminalCanvas?.nativeElement) return;
    
    const canvas = this.terminalCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    
    if (this.ctx) {
      this.isCanvasInitialized = true;
      this.resizeCanvas();
    }
  }
  
  resizeCanvas(): void {
    if (!this.terminalCanvas?.nativeElement || !this.ctx) return;
    
    const canvas = this.terminalCanvas.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.terminalDimensions.width = container.clientWidth;
      this.terminalDimensions.height = container.clientHeight;
    }
  }
  
  startVisualization(): void {
    if (!this.isCanvasInitialized) return;
    
    const animate = () => {
      this.drawTerminalView();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  drawTerminalView(): void {
    if (!this.ctx || !this.isCanvasInitialized) return;
    
    const ctx = this.ctx;
    const width = this.terminalDimensions.width;
    const height = this.terminalDimensions.height;
    const padding = this.terminalDimensions.padding;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#0c2461';
    ctx.fillRect(0, 0, width, height);
    
    // Draw terminal building
    this.drawTerminalBuilding(ctx, width, height, padding);
    
    // Draw gates
    this.drawGates(ctx, width, height, padding);
    
    // Draw passenger flow
    if (this.showPassengerFlow) {
      this.drawPassengerFlow(ctx, width, height, padding);
    }
    
    // Draw wait time indicators
    if (this.showWaitTimes) {
      this.drawWaitTimeIndicators(ctx, width, height, padding);
    }
    
    // Draw legend
    this.drawLegend(ctx, width, height);
  }
  
  drawTerminalBuilding(ctx: CanvasRenderingContext2D, width: number, height: number, padding: number): void {
    const terminalWidth = width - padding * 2;
    const terminalHeight = height - padding * 2;
    
    // Terminal outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, terminalWidth, terminalHeight);
    
    // Terminal sections
    const sections = [
      { x: padding + 100, width: 300, label: 'Check-in' },
      { x: padding + 450, width: 200, label: 'Security' },
      { x: padding + 700, width: 400, label: 'Gates Area' }
    ];
    
    sections.forEach((section, index) => {
      // Section background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(section.x, padding, section.width, terminalHeight);
      
      // Section separator
      if (index < sections.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(section.x + section.width, padding);
        ctx.lineTo(section.x + section.width, padding + terminalHeight);
        ctx.stroke();
      }
      
      // Section label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(section.label, section.x + section.width / 2, padding + 20);
    });
  }
  
  drawGates(ctx: CanvasRenderingContext2D, width: number, height: number, padding: number): void {
    const terminalHeight = height - padding * 2;
    const gateAreaStart = padding + 700;
    const gateAreaWidth = width - gateAreaStart - padding;
    
    const filteredGates = this.getFilteredGates();
    const gatesPerSide = Math.ceil(filteredGates.length / 2);
    
    // Left side gates
    for (let i = 0; i < gatesPerSide; i++) {
      if (i >= filteredGates.length) break;
      
      const gate = filteredGates[i];
      const y = padding + (terminalHeight / gatesPerSide) * i + 30;
      
      this.drawGate(ctx, gate, gateAreaStart + 40, y, true);
    }
    
    // Right side gates
    for (let i = 0; i < gatesPerSide; i++) {
      const index = i + gatesPerSide;
      if (index >= filteredGates.length) break;
      
      const gate = filteredGates[index];
      const y = padding + (terminalHeight / gatesPerSide) * i + 30;
      
      this.drawGate(ctx, gate, gateAreaStart + gateAreaWidth - 100, y, false);
    }
  }
  
  drawGate(ctx: CanvasRenderingContext2D, gate: GateStatus, x: number, y: number, isLeftSide: boolean): void {
    const isHighlighted = this.highlightGate === gate.id;
    
    // Gate rectangle
    ctx.fillStyle = this.getGateColor(gate.status);
    ctx.globalAlpha = isHighlighted ? 0.9 : 0.7;
    ctx.fillRect(x, y, 60, 40);
    
    // Gate border
    ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.strokeRect(x, y, 60, 40);
    
    // Gate number
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gate.gateNumber, x + 30, y + 25);
    
    // Gate status indicator
    ctx.fillStyle = this.getStatusIndicatorColor(gate.status);
    ctx.beginPath();
    ctx.arc(x + 50, y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Flight info if occupied
    if (gate.currentFlight && gate.status === 'Occupied') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(gate.currentFlight, x + 30, y + 35);
    }
    
    ctx.globalAlpha = 1;
    
    // Add click handler (simulated)
    this.drawGateHitArea(ctx, x, y, 60, 40, gate.id);
  }
  
  drawGateHitArea(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, gateId: string): void {
    // This is for hit detection - not visible
    ctx.fillStyle = 'transparent';
    ctx.fillRect(x, y, width, height);
  }
  
  drawPassengerFlow(ctx: CanvasRenderingContext2D, width: number, height: number, padding: number): void {
    const time = this.simulationTime;
    const density = this.passengerDensity;
    const particleCount = Math.floor(50 * density);
    
    for (let i = 0; i < particleCount; i++) {
      // Animated particles representing passengers
      const phase = (i / particleCount) * Math.PI * 2;
      const x = padding + 200 + Math.sin(time + phase) * 100 + Math.random() * 200;
      const y = padding + 100 + (i % 5) * 80 + Math.sin(time * 2 + i) * 20;
      
      ctx.fillStyle = `rgba(52, 152, 219, ${0.5 + Math.sin(time + i) * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  drawWaitTimeIndicators(ctx: CanvasRenderingContext2D, width: number, height: number, padding: number): void {
    const securityArea = {
      x: padding + 450,
      y: padding + 50,
      width: 200,
      height: 100
    };
    
    // Wait time bar
    const averageWaitTime = this.getAverageWaitTime();
    const waitBarWidth = (averageWaitTime / 30) * securityArea.width;
    
    ctx.fillStyle = this.getWaitTimeColor(averageWaitTime);
    ctx.fillRect(securityArea.x, securityArea.y, waitBarWidth, 20);
    
    // Wait time label
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Wait: ${averageWaitTime} min`, securityArea.x, securityArea.y + 35);
    
    // Animated queue
    this.drawQueueAnimation(ctx, securityArea.x, securityArea.y + 50, securityArea.width, averageWaitTime);
  }
  
  drawQueueAnimation(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, waitTime: number): void {
    const queueLength = Math.min(10, Math.floor(waitTime / 3));
    
    for (let i = 0; i < queueLength; i++) {
      const offset = (this.simulationTime * 20 + i * 30) % width;
      const personX = x + offset;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - i * 0.1})`;
      ctx.beginPath();
      ctx.arc(personX, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const legendX = width - 150;
    const legendY = 20;
    
    // Legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(legendX, legendY, 130, 120);
    
    // Legend title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Gate Status Legend', legendX + 10, legendY + 20);
    
    // Legend items
    const statuses = [
      { color: '#2ecc71', label: 'Available' },
      { color: '#3498db', label: 'Occupied' },
      { color: '#e74c3c', label: 'Maintenance' },
      { color: '#95a5a6', label: 'Closed' }
    ];
    
    statuses.forEach((status, index) => {
      ctx.fillStyle = status.color;
      ctx.beginPath();
      ctx.arc(legendX + 15, legendY + 40 + index * 20, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = '11px Arial';
      ctx.fillText(status.label, legendX + 30, legendY + 45 + index * 20);
    });
  }
  
  // Utility methods
  getGateColor(status: string): string {
    switch(status.toLowerCase()) {
      case 'available': return '#2ecc71';
      case 'occupied': return '#3498db';
      case 'maintenance': return '#e74c3c';
      case 'closed': return '#95a5a6';
      default: return '#7f8c8d';
    }
  }
  
  getStatusIndicatorColor(status: string): string {
    switch(status.toLowerCase()) {
      case 'available': return '#27ae60';
      case 'occupied': return '#2980b9';
      case 'maintenance': return '#c0392b';
      case 'closed': return '#7f8c8d';
      default: return '#95a5a6';
    }
  }
  
  getWaitTimeColor(waitTime: number): string {
    if (waitTime < 10) return '#2ecc71';
    if (waitTime < 20) return '#f39c12';
    return '#e74c3c';
  }
  
  getAverageWaitTime(): number {
    if (this.terminals.length === 0) return 0;
    const total = this.terminals.reduce((sum, terminal) => sum + terminal.securityWaitTime, 0);
    return Math.round(total / this.terminals.length);
  }
  
  getFilteredGates(): GateStatus[] {
    let filtered = this.gates;
    
    if (this.selectedTerminal !== 'all') {
      filtered = filtered.filter(gate => gate.terminal === this.selectedTerminal);
    }
    
    return filtered;
  }
  
  applyFilters(filters: any): void {
    // Implement filter logic based on form values
    console.log('Applying filters:', filters);
  }
  
  // Event handlers
  onTerminalSelect(terminalId: string): void {
    this.selectedTerminal = terminalId;
    this.filterForm.patchValue({ terminal: terminalId });
  }
  
  onViewModeChange(mode: 'overview' | 'detailed' | '3d'): void {
    this.viewMode = mode;
  }

  getFilterFormControls(filter: AbstractControl, field: string): FormControl {
    return (filter as FormGroup).get(field) as FormControl;
  }
  
  onCanvasClick(event: MouseEvent): void {
    if (!this.terminalCanvas?.nativeElement || !this.ctx) return;
    
    const canvas = this.terminalCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if click is on a gate (simplified hit detection)
    const clickedGate = this.findGateAtPosition(x, y);
    if (clickedGate) {
      this.onGateClick(clickedGate);
    }
  }
  
  findGateAtPosition(x: number, y: number): GateStatus | null {
    // Simplified gate hit detection
    // In a real implementation, you'd need proper hit detection logic
    return null;
  }
  
  onGateClick(gate: GateStatus): void {
    this.highlightGate = gate.id;
    
    // Show gate details dialog
    const dialogRef = this.dialog.open(GateAssignmentDialog, {
      width: '600px',
      data: { gate }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      this.highlightGate = null;
      if (result) {
        this.loadTerminalData(); // Refresh data
      }
    });
  }
  
  onTerminalClick(terminal: TerminalStatus): void {
    const dialogRef = this.dialog.open(TerminalDetailDialog, {
      width: '800px',
      data: { terminal }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result?.refresh) {
        this.loadTerminalData();
      }
    });
  }
  
  toggleWaitTimes(): void {
    this.showWaitTimes = !this.showWaitTimes;
  }
  
  togglePassengerFlow(): void {
    this.showPassengerFlow = !this.showPassengerFlow;
  }
  
  toggleGateStatus(): void {
    this.showGateStatus = !this.showGateStatus;
  }
  
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    } else if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
  
  exportTerminalData(): void {
    const data = {
      terminals: this.terminals,
      gates: this.getFilteredGates(),
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `terminal-data-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    
    this.snackBar.open('Terminal data exported successfully', 'Close', { duration: 3000 });
  }
  
  // Cleanup
  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.simulationSubscription) {
      this.simulationSubscription.unsubscribe();
    }
    
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  getTotalPassengers(): number {
    return this.terminals.reduce((sum, terminal) => sum + terminal.passengerCount, 0);
  }
  
  getOccupiedGates(): number {
    return this.getFilteredGates().filter(gate => gate.status === 'Occupied').length;
  }
  
  getAvailableGates(): number {
    return this.getFilteredGates().filter(gate => gate.status === 'Available').length;
  }
  
  getTerminalsWithHighWait(): number {
    return this.terminals.filter(terminal => terminal.securityWaitTime > 20).length;
  }
  
  getTerminalOccupancy(terminal: TerminalStatus): number {
    // Calculate occupancy based on passenger count and capacity
    const capacity = 5000; // Example capacity
    return Math.min(100, Math.round((terminal.passengerCount / capacity) * 100));
  }
  
  getProgressColor(crowdedness: string): string {
    switch(crowdedness.toLowerCase()) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      case 'critical': return 'warn';
      default: return 'primary';
    }
  }
  
  openTerminalDashboard(terminal: TerminalStatus): void {
    // Navigate to terminal-specific dashboard
    console.log('Opening dashboard for:', terminal.terminal);
    // this.router.navigate(['/terminal', terminal.id]);
  }
  
  // Add these properties to the component class
  lastUpdateTime = new Date();
  isLoading = false;
}