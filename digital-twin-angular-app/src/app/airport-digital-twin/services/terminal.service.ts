import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TerminalService {
  // Add terminal-specific methods here
  getTerminalAnalytics(terminalId: string): Observable<any> {
    return of({
      id: terminalId,
      hourlyPassengers: Array.from({length: 24}, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 1000) + 500
      })),
      peakHours: [8, 9, 17, 18],
      averageStay: 90 // minutes
    }).pipe(delay(500));
  }
}