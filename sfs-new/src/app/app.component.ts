import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Edge, Graph, Node } from '@antv/x6';
import { GraphService } from './graph.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  providers:[GraphService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('graphContainer') graphContainer!: ElementRef;
  color = '';
  graph: Graph | undefined;
  draggedElementId: string | null = null;
  selectedNode: Node | null = null;
  selectedEdge: Edge | null = null;
  graphList: Array<{ _id: string }> = [];
  selectedGraphId: string = '';
  constructor(@Inject(PLATFORM_ID) private platformId: Object, private graphService: GraphService) {}
  
  ngOnInit() {
    // Initialize will happen in ngAfterViewInit\
    this.fetchGraphList();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeGraph();
    }
  }

  initializeGraph() {
    this.graph = new Graph({
      container: this.graphContainer.nativeElement,
      width: 500,
      height: 500,
      grid: {
        size: 1,
        visible: true,
        type: 'dot',
        args: {
          color: '#ccc',
        },
      },
      interacting: {
        nodeMovable: true,
        edgeMovable: true,
        edgeLabelMovable: true,
        arrowheadMovable: true,
        vertexMovable: true,
        vertexAddable: true,
      },
      connecting: {
        router: 'manhattan',
        connector: {
          name: 'rounded',
          args: {
            radius: 8,
          },
        },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false, // Keep this occurrence
        snap: {
          radius: 20,
        },
        createEdge() {
          return this.createEdge({
            attrs: {
              line: {
                stroke: '#008fb2',
                strokeWidth: 1.5,
                targetMarker: {
                  name: 'block',
                  width: 12,
                  height: 8,
                },
              },
            },
            zIndex: 0,
          });
        },
        validateConnection({ sourceMagnet, targetMagnet }) {
          // Allow connection only from 'out' to 'in'
          if (sourceMagnet?.getAttribute('port-group') !== 'out') {
            return false;
          }
          if (targetMagnet?.getAttribute('port-group') !== 'in') {
            return false;
          }
          return true;
        },
        allowLoop: false,  // Disallow self-looping links
      },
    });
  
    // Enable features that require separate initialization
    this.graph.enablePanning();
    
    // Setup event listeners for selection and deletion
    this.setupGraphEventListeners();
  }

  setupGraphEventListeners() {
    if (!this.graph) return;
    
    // Node click event with manual selection handling
    this.graph.on('node:click', ({ node }: { node: Node }) => {
      if (node) {
        this.showTextInput(node);
        // Deselect previously selected items
        if (this.selectedNode) {
          this.selectedNode.attr('body/stroke', this.color);
          this.selectedNode.attr('body/strokeWidth', 1.5);
        }
        if (this.selectedEdge) {
          this.selectedEdge.attr('line/stroke', this.color);
          this.selectedEdge.attr('line/strokeWidth', 1.5);
        }

        // Select new node
        this.selectedNode = node;
        this.selectedEdge = null;
        this.color = this.selectedNode?.attr('body/stroke');
        console.log(this.color);
        // Visual feedback for selection
        node.attr('body/stroke', 'red');
        node.attr('body/strokeWidth', 3);
        console.log('Node selected:', node);
      }
    });

    // Edge click event with manual selection handling
    this.graph.on('edge:click', ({ edge }: { edge: Edge }) => {
      if (edge) {
        // Deselect previously selected items
        if (this.selectedNode) {
          this.selectedNode.attr('body/stroke', this.color);
          this.selectedNode.attr('body/strokeWidth', 1.5);
        }

        if (this.selectedEdge) {
          this.selectedEdge.attr('line/stroke', this.color);
          this.selectedEdge.attr('line/strokeWidth', 1.5);
        }

        // Select new edge
        this.selectedEdge = edge;
        this.selectedNode = null;
        this.color = this.selectedEdge?.attr('line/stroke');
        console.log(this.color);
        // Visual feedback for selection
        edge.attr('line/stroke', 'red');
        edge.attr('line/strokeWidth', 4);

        console.log('Edge selected:', edge);
      }
    });

    // Deselection on blank click
    this.graph.on('blank:click', () => {
      // Reset any selected node
      
      if (this.selectedNode) {
        this.selectedNode.attr('body/stroke', this.color);
        this.selectedNode.attr('body/strokeWidth', 1.5);
      }

      // Reset any selected edge
      if (this.selectedEdge) {
        this.selectedEdge.attr('line/stroke', this.color);
        this.selectedEdge.attr('line/strokeWidth', 2);
      }
      this.selectedNode = null;
      this.selectedEdge = null;
    });
  }

  // Remove selected node
  removeSelectedNode() {
    if (this.graph && this.selectedNode) {
      this.graph.removeNode(this.selectedNode);
      this.selectedNode = null;
    }
  }

  // Remove selected edge
  removeSelectedEdge() {
    if (this.graph && this.selectedEdge) {
      this.graph.removeEdge(this.selectedEdge);
      this.selectedEdge = null;
    }
  }

  onDragStart(event: DragEvent) {
    if (!event.dataTransfer || !event.target) return;

    const target = event.target as HTMLElement;
    this.draggedElementId = target.id;
    event.dataTransfer.setData('text/plain', target.id);
    event.dataTransfer.effectAllowed = 'copy';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent) {
    console.log('Checking graph from drop - ',this.graph);
    event.preventDefault();
    if (!this.graph || !this.draggedElementId) return;

    const rect = this.graphContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Constants for layout
    const PADDING = {
      horizontal: 16,
      vertical: 8,
      iconGap: 12
    };
    const ICON_SIZE = 20;
    const INITIAL_WIDTH = 150;
    const INITIAL_HEIGHT = 30;
    if(this.draggedElementId === 'rectangle1') {
      // Create node and add it to the graph
      const node = this.graph.addNode({
        x,
        y,
        width: INITIAL_WIDTH,
        height: INITIAL_HEIGHT,
        attrs: {
          body: {
            fill: '#c8facd',
            stroke: '#98f0b8',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: 'Operation',
            fill: '#000',
            fontSize: 12,
            fontFamily: 'Montserrat',
            refX: PADDING.horizontal,
            refY: '50%',
            textVerticalAnchor: 'middle',
            textAnchor: 'start',
            textWrap: {
              width: INITIAL_WIDTH - PADDING.horizontal * 2 - ICON_SIZE - PADDING.iconGap,
              breakWord: true,
            },
          },
          icon: {
            href: 'factory-machine.png',
            width: ICON_SIZE,
            height: ICON_SIZE,
            refX: '100%',
            refY: '50%',
            refX2: -(PADDING.horizontal + ICON_SIZE / 2),
            refY2: -ICON_SIZE / 2,
          },
        },
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
          { tagName: 'image', selector: 'icon' },
        ],
        ports: {
          groups: {
            in: {
              position: 'left',
              attrs: {
                circle: {
                  r: 2,
                  magnet: 'passive', // Links cannot start from the in port
                  fill: '#000',
                },
              },
            },
            out: {
              position: 'right',
              attrs: {
                circle: {
                  r: 2,
                  magnet: true, // Links can start from the out port
                  fill: '#000',
                },
              },
            },
          },
          items: [
            { group: 'in', id: 'inPort' },
            { group: 'out', id: 'outPort' },
          ],
        },
        // Add a common reference id for all rectangles
        referenceId: 'operation1', // Add the common reference ID
      });
      this.showTextInput(node);
    }
    if(this.draggedElementId == 'rectangle2'){
      const node = this.graph.addNode({
        x,
        y,
        width: INITIAL_WIDTH,
        height: INITIAL_HEIGHT,
        attrs: {
          body: {
            fill: 'rgb(244, 255, 164)',
            stroke: '#f1f100',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: 'Rework',
            fill: '#000',
            fontSize: 12,
            fontFamily: 'Montserrat',
            // Position text in the vertical middle and left side with padding
            refX: PADDING.horizontal,
            refY: '50%',
            textVerticalAnchor: 'middle',  // Vertical center alignment
            textAnchor: 'start',          // Left alignment
            yAlignment: 'middle',         // Ensure vertical centering
            textWrap: {
              width: INITIAL_WIDTH - PADDING.horizontal * 2 - ICON_SIZE - PADDING.iconGap,
              height: undefined,
              breakWord: true,
            },
          },
          icon: {
            href: 'factory-machine.png',
            width: ICON_SIZE,
            height: ICON_SIZE,
            refX: '100%',
            refY: '50%',
            refX2: -(PADDING.horizontal + ICON_SIZE/2),
            refY2: -ICON_SIZE/2,
            xAlignment: 'middle',
            yAlignment: 'middle',
          },
        },
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
          { tagName: 'image', selector: 'icon' },
        ],
        ports: {
          groups: {
            in: {
              position: 'left',
              attrs: {
                circle: {
                  r: 2,
                  magnet: 'passive', // Links cannot start from the in port
                  fill: '#000',
                },
              },
            },
            out: {
              position: 'right',
              attrs: {
                circle: {
                  r: 2,
                  magnet: true, // Links can start from the out port
                  fill: '#000',
                },
              },
            },
          },
          items: [
            { group: 'in', id: 'inPort' },
            { group: 'out', id: 'outPort' },
          ],
        },
      });
      this.showTextInput(node);
    }
    if(this.draggedElementId === 'rectangle11') {
      // Create node and add it to the graph
      const node = this.graph.addNode({
        x,
        y,
        width: INITIAL_WIDTH,
        height: INITIAL_HEIGHT,
        attrs: {
          body: {
            fill: '#c8facd',
            stroke: '#98f0b8',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: 'Operation',
            fill: '#000',
            fontSize: 12,
            fontFamily: 'Montserrat',
            refX: PADDING.horizontal,
            refY: '50%',
            textVerticalAnchor: 'middle',
            textAnchor: 'start',
            textWrap: {
              width: INITIAL_WIDTH - PADDING.horizontal * 2 - ICON_SIZE - PADDING.iconGap,
              breakWord: true,
            },
          },
          icon: {
            href: 'graph.png',
            width: ICON_SIZE,
            height: ICON_SIZE,
            refX: '100%',
            refY: '50%',
            refX2: -(PADDING.horizontal + ICON_SIZE / 2),
            refY2: -ICON_SIZE / 2,
          },
        },
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
          { tagName: 'image', selector: 'icon' },
        ],
        ports: {
          groups: {
            in: {
              position: 'left',
              attrs: {
                circle: {
                  r: 2,
                  magnet: 'passive', // Links cannot start from the in port
                  fill: '#000',
                },
              },
            },
            out: {
              position: 'right',
              attrs: {
                circle: {
                  r: 2,
                  magnet: true, // Links can start from the out port
                  fill: '#000',
                },
              },
            },
          },
          items: [
            { group: 'in', id: 'inPort' },
            { group: 'out', id: 'outPort' },
          ],
        },
        // Add a common reference id for all rectangles
        referenceId: 'operation1', // Add the common reference ID
      });
      this.showTextInput(node);
    }
    if(this.draggedElementId == 'rectangle21'){
      const node = this.graph.addNode({
        x,
        y,
        width: INITIAL_WIDTH,
        height: INITIAL_HEIGHT,
        attrs: {
          body: {
            fill: 'rgb(244, 255, 164)',
            stroke: '#f1f100',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: 'Rework',
            fill: '#000',
            fontSize: 12,
            fontFamily: 'Montserrat',
            // Position text in the vertical middle and left side with padding
            refX: PADDING.horizontal,
            refY: '50%',
            textVerticalAnchor: 'middle',  // Vertical center alignment
            textAnchor: 'start',          // Left alignment
            yAlignment: 'middle',         // Ensure vertical centering
            textWrap: {
              width: INITIAL_WIDTH - PADDING.horizontal * 2 - ICON_SIZE - PADDING.iconGap,
              height: undefined,
              breakWord: true,
            },
          },
          icon: {
            href: 'graph.png',
            width: ICON_SIZE,
            height: ICON_SIZE,
            refX: '100%',
            refY: '50%',
            refX2: -(PADDING.horizontal + ICON_SIZE/2),
            refY2: -ICON_SIZE/2,
            xAlignment: 'middle',
            yAlignment: 'middle',
          },
        },
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
          { tagName: 'image', selector: 'icon' },
        ],
        ports: {
          groups: {
            in: {
              position: 'left',
              attrs: {
                circle: {
                  r: 2,
                  magnet: 'passive', // Links cannot start from the in port
                  fill: '#000',
                },
              },
            },
            out: {
              position: 'right',
              attrs: {
                circle: {
                  r: 2,
                  magnet: true, // Links can start from the out port
                  fill: '#000',
                },
              },
            },
          },
          items: [
            { group: 'in', id: 'inPort' },
            { group: 'out', id: 'outPort' },
          ],
        },
      });
      this.showTextInput(node);
    }
    // Create the node with center-aligned text and icon
    this.draggedElementId = null;
}

showTextInput(node: Node) {
  const rect = node.getBBox();

  // Get the current text from the node, ensuring it's a string
  const currentText = String(node.attr('label/text') || 'Enter label text');

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter label text';
  input.value = currentText; // Preload the current text into the input field
  input.style.position = 'absolute';
  input.style.left = `${rect.x + 16}px`;
  input.style.top = `${rect.y + rect.height + 5}px`;
  input.style.width = `${rect.width - 56}px`;
  input.style.padding = '4px 8px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '4px';
  input.style.zIndex = '1000';

  // Append the input field to the container
  this.graphContainer.nativeElement.appendChild(input);

  // Handle the blur event to save the updated text
  input.addEventListener('blur', () => {
    const labelText = input.value || node.attr('label/text');
    node.attr('label/text', labelText);
    this.adjustNodeSize(node, labelText);
    input.remove();
  });

  // Handle Enter key to submit the text
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      input.blur();
    }
  });

  // Focus on the input field
  input.focus();
}

adjustNodeSize(node: Node, text: string) {
  const PADDING = {
    horizontal: 16,
    vertical: 8,
    iconGap: 12
  };
  const ICON_SIZE = 24;
  const MIN_HEIGHT = 30;
  const MAX_WIDTH = 200;
  const INITIAL_WIDTH = 150;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    context.font = '12px Arial';
    const textWidth = context.measureText(text).width;
    
    let requiredWidth = textWidth + (PADDING.horizontal * 2) + ICON_SIZE + PADDING.iconGap;
    const finalWidth = Math.min(Math.max(INITIAL_WIDTH, requiredWidth), MAX_WIDTH);
    
    const availableTextWidth = finalWidth - (PADDING.horizontal * 2) - ICON_SIZE - PADDING.iconGap;
    const approxCharsPerLine = Math.floor(availableTextWidth / (context.measureText('m').width));
    const lines = Math.ceil(text.length / approxCharsPerLine);
    const lineHeight = 16;
    const requiredHeight = Math.max(MIN_HEIGHT, (lines * lineHeight) + (PADDING.vertical * 2));
    
    // Update node size
    node.resize(finalWidth, requiredHeight);
    
    // Update text wrap width
    node.attr('label/textWrap/width', availableTextWidth);
    
    // Keep text vertically centered even with multiple lines
    node.attr('label/refY', '50%');
    node.attr('label/textVerticalAnchor', 'middle');
    node.attr('label/yAlignment', 'middle');
    
    // Maintain icon position
    node.attr('icon/refX', '100%');
    node.attr('icon/refX2', -(PADDING.horizontal + ICON_SIZE/2));
    node.attr('icon/refY', '50%');
    node.attr('icon/refY2', -ICON_SIZE/2);
  }
}

  // Keyboard event handler for deletion
  onKeyDown(event: KeyboardEvent) {
    // Delete or Backspace key to remove selected node or edge
    if ((event.key === 'Delete')) {
      if (this.selectedNode) {

        this.removeSelectedNode();
      } else if (this.selectedEdge) {
        this.removeSelectedEdge();
      }
    }
  }

  fetchGraphList() {
    this.graphService.getAllGraphs().subscribe((graphs) => {
      this.graphList = graphs;
    });
  }

  // Save the current graph
  saveGraphToDatabase() {
    if (this.selectedNode) {
      this.selectedNode.attr('body/stroke', this.color);
      this.selectedNode.attr('body/strokeWidth', 1.5);
    }

    // Reset any selected edge
    if (this.selectedEdge) {
      this.selectedEdge.attr('line/stroke', this.color);
      this.selectedEdge.attr('line/strokeWidth', 2);
    }
    this.selectedNode = null;
    this.selectedEdge = null;
    const graphData = this.graph?.toJSON();
    this.graphService.saveGraph(graphData).subscribe(() => {
      console.log('Graph saved successfully');
      this.fetchGraphList(); // Refresh the list after saving
    });
  }

  // Load the selected graph by ID
  loadSelectedGraph() {
    if (!this.selectedGraphId) {
      alert('Please select a graph to load.');
      return;
    }

    if (!this.graph) {
      this.initializeGraph();
    }

    this.graphService.getGraphById(this.selectedGraphId).subscribe((graphData) => {
      if (this.graph) {
        // this.graph.clear(); // Clear the current graph
        this.graph.fromJSON(graphData.data); // Load the selected graph
        console.log('Graph loaded successfully');
      } else {
        console.error('Graph is still undefined. Initialization failed.');
      }
    });
  }
}