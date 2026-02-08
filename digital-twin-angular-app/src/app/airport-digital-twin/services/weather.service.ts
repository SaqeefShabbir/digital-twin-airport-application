import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  getCurrentWeather(): Observable<any> {
    return of({
      temperature: 22,
      condition: 'Sunny',
      humidity: 65,
      windSpeed: 12,
      visibility: 10,
      icon: 'wb_sunny'
    }).pipe(delay(500));
  }
}