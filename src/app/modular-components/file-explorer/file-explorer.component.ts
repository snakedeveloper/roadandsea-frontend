import { DomSanitizer } from '@angular/platform-browser';
import { ImportOrderRequest } from './../../templates/auth/requests';
import { OverlayRef, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { Subscription, fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { DataService } from 'src/app/services/data/data.service';
import { Folder } from 'src/app/templates/file-manager/folder';
import { File } from 'src/app/templates/file-manager/file';
import { MatInput } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { ImportOrderReply } from 'src/app/templates/auth/replies';
import { SafePipe } from 'src/app/classes/safe-pipe';
import { JoinGroup } from 'src/app/templates/file-manager/JoinGroup';

@Component( {
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
} )
export class FileExplorerComponent implements AfterViewChecked {
  inputJumpToOrder: string = '';
  inputManualOrder: string = '';
  inputJoinOrder: string = '';
  table: string = '';

  @ViewChild( 'fileMenu' ) fileMenu: TemplateRef<any> | undefined;
  @ViewChild( 'menuTrigger' ) trigger!: MatMenuTrigger;


  constructor(
    public dataService: DataService,
    public overlay: Overlay,
    public viewContainerRef: ViewContainerRef,
    public http: HttpClient,
    private cdref: ChangeDetectorRef
  ) {
    this.table = this.dataService.fileManagerTableName;

  }

  ngOnInit(): void {
    if ( !this.dataService.managerStructure.folders ) {
      this.dataService.setManagerStructure();
    }
  }

  ngAfterViewChecked() {
    // open menu when an order with message has been entered
    if ( this.trigger && !this.dataService.messageShowed &&
        (this.dataService.currentComments.length + this.dataService.getJoinedOrdersCount()) > 0 ) {
      this.trigger.openMenu();

      // should trigger only once
      this.dataService.messageShowed = true;

      // fix jump to order message window self opening
      if ( this.trigger && this.dataService.isFoldersLoading )
        this.trigger.closeMenu();

      // prevent "changed" exceptions
      this.cdref.detectChanges();
    }
  }

  /**
   * Translates intent to human readable form
   * @param intent - intent to translate (from File.intent property)
   * @returns - Visually appealing label for intent ;)
   */
  getIntentLabel( intent: string ): string {
    switch ( intent ) {
      case 'carrierOrder':
        return 'Zlecenie dla przewoźnika';
      case 'clientOrder':
        return 'Zlecenie od klienta';

      default:
        return 'Inne';
    }
  }

  /**
   * Jump button clicked in top menu
   */
  jumpToOrderClicked( orderId: string ) {
    const regex = this.matchOrderId( orderId );

    // check if orderId is in ZL1234/11/21 format
    if ( regex ) {
      let id = regex[1], month = regex[3], year = regex[4];
      let dbMonth = parseInt( month );

      if ( !regex[2] ) // if ZL prefix is missing
        id = 'ZL' + id;

      this.inputJumpToOrder = `${id}/${month}/${year}`;

      this.dataService.isFoldersLoading = true;

      let done = false;
      let promises = [];

      for ( let i = 0; i < 500; i++ ) { // @todo: change to dynamic number
        if ( done )
          break;

        const path = `${this.table}/${i}/years/20${year}/months/${dbMonth}/orders`;

        promises.push( this.dataService.store.collection( path ).doc( id ).get().toPromise().then( ( snapshot ) => {
          if ( done )
            return;

          console.log( `Checking path: ${path}/${id}` );

          if ( snapshot.exists ) {
            this.dataService.structureSet( `${path}/${id}/files` );
            done = true;
          }
        } ) );
      }

      Promise.all( promises ).then( () => {
        if ( !done )
          this.dataService.dialogService.openSimpleDialog( "Nie znaleziono.", "OK", "warning" );

        this.dataService.isFoldersLoading = false;
      } );
    } else {
      this.dataService.dialogService.openSimpleDialog( "Sprawdź pisownię! Numer zlecenia powinien wyglądać następująco: </br><b>ZL1234/05/06", "OK", "warning" );
    }
  }

  /**
   * Manual order adding button clicked in top menu
   */
  manualOrderClicked( orderId: string ) {
    const id = this.parseOrderId( orderId );

    // check if orderId is in ZL1234/11/21 format
    if ( id ) {
      this.inputManualOrder = id;
      this.dataService.isFoldersLoading = true;

      const request: ImportOrderRequest = {
        sid: localStorage.getItem( 'sid' ) ?? "",
        order: id
      }

      this.http.post( this.dataService.apiAdres + '/importOrder', request ).toPromise().then( ( response ) => {
        const reply = response as ImportOrderReply;

        if ( reply.result ) {
          this.dataService.dialogService.openSimpleDialog( "Zlecenie zostało dodane.", "OK", "positive" );
        } else {
          this.dataService.dialogService.openSimpleDialog( "Błąd! " + reply.message, "OK", "warning" );
        }
      } ).catch( () => {
        this.dataService.dialogService.openSimpleDialog( "Nie udało się połączyć z serwerem.", "OK", "warning" );
      } ).finally( () => {
        this.dataService.isFoldersLoading = false;
      } );
    } else {
      this.dataService.dialogService.openSimpleDialog( "Sprawdź pisownię! Numer zlecenia powinien wyglądać następująco: </br><b>ZL1234/05/06", "OK", "warning" );
    }
  }

  addLeadingZero( digit: string ): string {
    return digit.length === 1 ? '0' + digit : digit;
  }

  /**
   * Join current order with another one
   * @param orderId - order id to join with
   */
  async joinOrderClicked( orderId: string ) {
    const regex = this.matchOrderId( orderId );
    const store = this.dataService.store, dialog = this.dataService.dialogService; // shortcuts

    try {
      this.dataService.isFoldersLoading = true; // stop mr. user

      if ( regex ) {
        // a = current order
        const a_userId = this.dataService.currentStructure.split( '/' )[1],
              a_orderId = this.getCurrentOrderId(),
              a_orderPath = this.dataService.currentStructure.split( '/files' )[0];

        // b = destination order
        let b_orderId = regex[1],
            b_month = regex[3],
            b_year = regex[4],
            b_fullId = `${b_orderId}/${b_month}/${b_year}`;

        if ( !regex[2] ) { // if ZL prefix is missing
          b_orderId = 'ZL' + b_orderId;
          b_fullId = 'ZL' + b_fullId;
        }

        if ( b_month[0] === '0' ) // if month is in format 01 instead of 1
          b_month = b_month[1];

        let b_orderPath = `${this.table}/${a_userId}/years/20${b_year}/months/${b_month}/orders/${b_orderId}`;

        this.inputJoinOrder = b_fullId; // correct value in input box entered by user

        const getOrdersJobs = [
          store.doc( a_orderPath ).get().toPromise(), // source order
          store.doc( b_orderPath ).get().toPromise(), // destination order
        ];

        let getOrdersResults = await Promise.all( getOrdersJobs ); // wait for both orders to be loaded
        let source = getOrdersResults[0], destination = getOrdersResults[1];

        if ( source.exists && destination.exists ) {
          const sourceOrder = source.data() as Folder, destinationOrder = destination.data() as Folder;

          if ( sourceOrder.joinGroup ) { // if source order is already joined somewhere
            if ( sourceOrder.joinGroup === destinationOrder.joinGroup ) {
              dialog.openSimpleDialog( "Zlecenie jest już połączone z podanym zleceniem.", "OK", "warning" );
            } else if ( destinationOrder.joinGroup ) { // joinGroup exists but it's not the same
              dialog.openSimpleDialog( "Zlecenie jest już połączone z inną grupą.", "OK", "warning" );
            } else { // if destination order is not joined anywhere
              store.doc( b_orderPath ).update( { joinGroup: sourceOrder.joinGroup } ); // give the destination order the same joinGroup as source order
              let joinGroup = await store.collection( `${this.table}/${a_userId}/joins/` ).doc( sourceOrder.joinGroup ).get().toPromise(); // get join group data for updating

              if ( joinGroup.exists ) {
                const joinData = joinGroup.data() as JoinGroup;

                // add the destination order to the source joinGroup
                joinData.orders.push( b_fullId );
                store.collection( `${this.table}/${a_userId}/joins/` ).doc( sourceOrder.joinGroup ).set( joinData );

                dialog.openSimpleDialog( "Zlecenia zostały połączone:<br/><br/>" + joinData.orders.join( '</br>' ), "OK", "positive" );
              } else { // joinGroup doesn't exist, but it should
                dialog.openSimpleDialog( "Błąd wewnętrzny: Nie udało się połączyć tych zleceń.", "OK", "warning" );
              }
            }
          } else if ( destinationOrder.joinGroup ) { // source wasn't then maybe destination order is joined somewhere            
            store.doc( a_orderPath ).update( { joinGroup: destinationOrder.joinGroup } ); // give the source order the same joinGroup as destination order

            let joinGroup = await store.collection( `${this.table}/${a_userId}/joins/` ).doc( destinationOrder.joinGroup ).get().toPromise(); // get join group data for updating

            if ( joinGroup.exists ) {
              const joinData = joinGroup.data() as JoinGroup;

              // add the source order to destination join group
              joinData.orders.push( a_orderId );
              store.collection( `${this.table}/${a_userId}/joins/` ).doc( destinationOrder.joinGroup ).set( joinData );

              dialog.openSimpleDialog( "Zlecenia zostały połączone:<br/><br/>" + joinData.orders.join( '</br>' ), "OK", "positive" );
            } else { // that should never happen
              dialog.openSimpleDialog( "Błąd wewnętrzny: Nie udało się połączyć tych zleceń.", "OK", "warning" );
            }
          } else { // if source and destination orders are not joined anywhere, create new join group
            const newGroup = await store.collection( `${this.table}/${a_userId}/joins/` ).add( { orders: [a_orderId, b_fullId] } );

            // add the new group to both orders
            store.doc( a_orderPath ).update( { joinGroup: newGroup.id } );
            store.doc( b_orderPath ).update( { joinGroup: newGroup.id } );
            
            dialog.openSimpleDialog( "Zlecenia zostały połączone:<br/><br/>" + [a_orderId, b_fullId].join( '</br>' ), "OK", "positive" );
          }
        } else { // if one of the orders doesn't exist
          dialog.openSimpleDialog( "Nie znaleziono zlecenia lub to zlecenie nie należy do tego samego użytkownika.", "OK", "warning" );
        }
      } else { // if order id is incorrect
        this.dataService.dialogService.openSimpleDialog( "Sprawdź pisownię! Numer zlecenia powinien wyglądać następująco: </br><b>ZL1234/05/06", "OK", "warning" );
      }
    } catch ( error ) {
      dialog.openSimpleDialog( "Błąd połączenia z serwerem.", "OK", "error" );
    } finally {
      this.dataService.isFoldersLoading = false; // you're free mr. user
    }
  }

  /**
   * Parse order id with and return it in ZL1234/11/21 format
   * @param orderId - order id to parse
   * @returns - Corrected order id or empty string if invalid
   */
  parseOrderId( orderId: string ): string {
    const regex = this.matchOrderId( orderId );

    // check if orderId is in ZL1234/11/21 format
    if ( regex ) {
      if ( regex[2] ) { // if there is "ZL" part of order id
        return `${regex[1]}/${regex[3]}/${regex[4]}`;
      } else { // if not then add "ZL" at the beginning
        return `ZL${regex[1]}/${regex[3]}/${regex[4]}`;
      }
    }

    return "";
  }

  /**
   * Parse order id with REGEXP and return the regex array
   * @param orderId - order id to parse
   * @returns - regex array from matched order id
   */
  matchOrderId( orderId: string ): RegExpMatchArray | null {
    return orderId.toUpperCase().match( /((ZL)?[0-9]{4})[\/\-\.\,\\\s]([0-9]{2})[\/\-\.\,\\\s]([0-9]{2})/i );
  }

  getCurrentOrderId(): string {
    const regex = this.dataService.currentStructure.match( /.*years\/\d{2}(\d{2})\/months\/0?(1?\d)\/orders\/(ZL\d{4})/i );

    if ( regex ) {


      return `${regex[3]}/${this.addLeadingZero( regex[2] )}/${regex[1]}`;
    } else {
      return "null";
    }
  }

  /**
   * Sorts documents for viewing pleasure ;)
   * @param files - array of files
   * @returns sorted array of files
   */
  sortedFiles( files: File[] ): File[] {
    return files.sort( ( a, b ) => {
      if ( a.intent === 'carrierOrder' && b.intent !== 'carrierOrder' )
        return -1;
      else if ( a.intent !== 'carrierOrder' && b.intent === 'carrierOrder' )
        return 1;
      else if ( a.intent === 'clientOrder' && b.intent !== 'clientOrder' )
        return -1;
      else if ( a.intent !== 'clientOrder' && b.intent === 'clientOrder' )
        return 1;
      else // sort 'other' files by name
        return a.fileName.localeCompare( b.fileName );
    } );
  }

  /**
   * @returns -Height of the app content in px
   */
  getSideNavContentHeight(): number {
    return this.dataService.sideNavContentHeightNumber - 150;
  }

  setRightContentHeight(): number {
    return this.dataService.sideNavContentHeightNumber - 185;
  }

  isTooLong( name: string, max: number = 14 ): string {
    if ( name.length > max ) {
      return name.substring( 0, max ) + '...';
    } else
      return name;
  }
  /**
    * On Right Click contex msenu overlay
    */
  openContextMenu( { x, y }: MouseEvent, file: any ) {
    this.dataService.closeContextMenu();
    this.dataService.fileToDeleteIs = file
    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo( { x, y } )
      .withPositions( [
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
        }
      ] );
    console.log( 'clicked on file: ', file )

    this.dataService.overlayRef = this.overlay.create( {
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close()
    } );

    this.dataService.overlayRef.attach( new TemplatePortal( this.fileMenu!, this.viewContainerRef, {
      $implicit: file
    } ) );

    this.dataService.sub = fromEvent<MouseEvent>( document, 'click' )
      .pipe(
        filter( event => {
          const clickTarget = event.target as HTMLElement;
          return !!this.dataService.overlayRef &&
            !this.dataService.overlayRef.overlayElement.contains( clickTarget );
        } ),
        take( 1 )
      ).subscribe( () => this.dataService.closeContextMenu() )
  }
}

