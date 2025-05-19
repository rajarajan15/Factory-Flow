import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private baseUrl = 'http://localhost:5000/api'; // Adjust URL as needed

  constructor(private http: HttpClient) {}

  getAllGraphs(): Observable<Array<{ _id: string }>> {
    return this.http.get<Array<{ _id: string }>>(`${this.baseUrl}/graphs`);
  }

  // Fetch a graph by its ID
  getGraphById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/graphs/${id}`);
  }

  // Save a graph
  saveGraph(graphData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save-graph`, graphData);
  }
}
