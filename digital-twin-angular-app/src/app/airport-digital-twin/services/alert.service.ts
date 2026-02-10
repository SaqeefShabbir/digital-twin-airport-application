import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Alert } from '../models/airport-models';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertsSubject = new BehaviorSubject<Alert[]>(this.generateInitialAlerts());
  
  getAlerts(): Observable<Alert[]> {
    return this.alertsSubject.asObservable().pipe(delay(200));
  }
  
  acknowledgeAlert(alertId: string): Observable<boolean> {
    const alerts = this.alertsSubject.value;
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    
    if (alertIndex > -1) {
      alerts[alertIndex].acknowledged = true;
      this.alertsSubject.next([...alerts]);
      return of(true).pipe(delay(200));
    }
    
    return of(false).pipe(delay(200));
  }

  getAlertsStream(): Observable<Alert[]> {
    return this.alertsSubject.asObservable();
  }
  
  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Observable<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: `ALERT${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false
    };
    
    const alerts = this.alertsSubject.value;
    this.alertsSubject.next([newAlert, ...alerts]);
    
    return of(newAlert).pipe(delay(200));
  }
  
  private generateInitialAlerts(): Alert[] {
    return [
      {
        id: 'ALERT1',
        type: 'Critical',
        title: 'Security Queue Exceeded',
        description: 'Security wait time at Terminal 3 exceeds 30 minutes',
        timestamp: new Date(Date.now() - 15 * 60000),
        location: 'Terminal 3 Security',
        acknowledged: false,
        priority: 1,
        terminal: '3',
        estimatedResolutionTime: Date.now() + 30 * 60000,
        assignedTo: 'Security Team',
        requiresAcknowledgement: true,
        category: 'Security',
        autoEscalate: true,
        resolved: false
      },
      {
        id: 'ALERT2',
        type: 'Warning',
        title: 'Baggage System Delay',
        description: 'Baggage carousel B3 experiencing technical issues',
        timestamp: new Date(Date.now() - 30 * 60000),
        location: 'Terminal 2 Baggage Claim',
        acknowledged: false,
        priority: 2,
        terminal: '2',
        estimatedResolutionTime: Date.now() + 20 * 60000,
        assignedTo: 'Baggage Operations',
        requiresAcknowledgement: true,
        category: 'Operations',
        autoEscalate: false,
        resolved: false
      },
      {
        id: 'ALERT3',
        type: 'Info',
        title: 'Gate Change',
        description: 'Flight DL123 moved from Gate A12 to Gate A14',
        timestamp: new Date(Date.now() - 45 * 60000),
        location: 'Terminal 1',
        acknowledged: true,
        priority: 3,
        terminal: '1',
        estimatedResolutionTime: Date.now(),
        assignedTo: 'Gate Operations',
        requiresAcknowledgement: false,
        category: 'Flight Operations',
        autoEscalate: false,
        resolved: true
      }
    ];
  }
}