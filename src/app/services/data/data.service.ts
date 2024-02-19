import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, Subscription } from 'rxjs';
import { User } from 'src/app/templates/data/user';
import { File } from 'src/app/templates/file-manager/file';
import { Folder } from 'src/app/templates/file-manager/folder';
import { ManagerStructure } from 'src/app/templates/file-manager/managerStructure';
import { finalize } from 'rxjs/operators';
import { OverlayRef } from '@angular/cdk/overlay';
import { DialogService } from '../dialog.service';
import { HttpClient } from '@angular/common/http';
import { LogoutSpedTransRequest } from 'src/app/templates/auth/requests';
import { LogoutSpedTransReply } from 'src/app/templates/auth/replies';
import { NavList } from 'src/app/templates/menu/navList';
import { Sql } from 'src/app/templates/data/sql';
import { Comments } from 'src/app/templates/file-manager/comments';
import { Comment } from 'src/app/templates/file-manager/comment';
import { TimerCounter } from 'src/app/templates/data/timerCounter';
import { JoinGroup } from 'src/app/templates/file-manager/JoinGroup';


@Injectable( {
  providedIn: 'root'
} )
export class DataService {
  /**
   * Envoirment variables:
   */
  apiAdres: string = 'https://tft-rs-zlecenia-6655964ef121.herokuapp.com/'
  // apiAdres: string = 'http://localhost:5000';
  readonly ORDERS: string = 'rns-orders';
  readonly USERS = 'users';
  /**
 * LOADINGS
 */
  isFoldersLoading: boolean = false;
  isFileUploading: boolean = false;
  IsUserTableLoading: boolean = false;

  /**
   * CONFIG
   */
  sql = {} as Sql;
  spedTransLogTimeSetter: any;

  /**
   * User Table
   */
  users_table_data: User[] = [];
  usersDisplayedColumns: string[] = ['name', 'email', 'folders', 'spedTransLog', 'role', 'menu'];
  usersDataSource: any;
  userTimerCounters: TimerCounter[] = [];

  /**
   * User data taken from firebase after logged in.
   */
  user = {} as User;
  /**
     * SideNavContent height in px;
     */
  sideNavContentHeightNumber = 0;
  /**
     * File Manager
     */
  managerStructure = {} as ManagerStructure;
  userFolders = [] as Folder[];

  currentStructure: string = this.ORDERS;

  navList: NavList[] = [
    /*{ ----------------- Maybe later
        name: 'Szukaj',
        link: 'search',
        icon: 'search',
        display: true,
        adminOnly: "true"
      },*/
    {
      name: 'Zlecenia',
      link: 'orders',
      icon: 'assignment',
      display: true,
      adminOnly: "false"
    },
    {
      name: 'Użytkownicy',
      link: 'users',
      icon: 'people',
      display: true,
      adminOnly: "true"
    }
  ];

  commentToAdd: string = '';
  currentComments: Comment[] = [];
  currentCommentsToAdd: any;

  fileUploadProgressValue: Observable<number | undefined> | undefined;


  overlayRef: OverlayRef | null | undefined;
  sub: Subscription | undefined;
  fileToDeleteIs: File | undefined;
  adresUrl: String = '';
  isClientOrderUploaded: String = '';
  isCarrerOrderUploaded: String = '';
  messageShowed: boolean = false;

  currentJoinGroup: JoinGroup | undefined;


  constructor(
    public store: AngularFirestore,
    public storage: AngularFireStorage,
    public dialogService: DialogService,
    public http: HttpClient,
  ) {}

  //FILE MANAGER SECTION

  /**
   * @todo -Push folders to manageStructure depends for current structure
   */
  setManagerStructure() {
    //this.isFoldersLoading = true
    console.log( 'getting users' );
    this.managerStructure.folders = [];
    this.managerStructure.files = [];
    this.store.doc( `${this.USERS}/${localStorage.getItem( 'uid' )}` ).get().subscribe( user => {
      if ( user ) {
        const currentuser = user.data() as User;
        if ( currentuser.managerLastRef )
          this.currentStructure = currentuser.managerLastRef;
        this.loadComments();
        this.setUrlStructure();
        console.log( 'current structure is: ', this.currentStructure );
        if ( this.loadFolders() ) {
          if ( this.loadFiles() ) {
            //this.isFoldersLoading = false
          }
        }
      }
    } );
  }

  loadFolders(): boolean {
    const folders = this.store.collection( this.currentStructure, sort =>
      sort.orderBy( 'folderName', 'asc' ) ).get();
    let promiseFolder: Folder[] = [];
    folders.subscribe( foldersData => {
      foldersData.forEach( folderData => {
        if ( folderData ) {
          const get_type = folderData.data() as File;
          if ( get_type.type !== 'file' ) {
            const folder_reply = folderData.data() as Folder;
            const folder: Folder = {
              folderName: folder_reply.folderName,
              ref: folder_reply.ref,
              type: folder_reply.type,
              joinGroup: folder_reply.joinGroup,
              correction: false,
              hidden: folder_reply.hidden,
              canceled: folder_reply.canceled
            };

            promiseFolder.push( folder );
          }
        }
        Promise.all( promiseFolder ).then( result => {
          this.isOrderUploaded();
          this.managerStructure.folders = promiseFolder;
          return true;
        } );
      } );
    } );
    return true;
  }

  loadFiles(): boolean {
    const files = this.store.collection( this.currentStructure, sort => sort.orderBy( 'intent', 'asc' ) ).get();
    let fileArray: File[] = [];
    files.subscribe( filesData => {
      filesData.forEach( async fileData => {
        if ( fileData.exists ) {
          const get_type = fileData.data() as File;

          if ( get_type.type === 'file' ) {
            const fileData_reply = fileData.data() as File;
            const file: File = {
              fileName: '' + fileData_reply.fileName,
              ref: fileData_reply.ref,
              type: fileData_reply.type,
              intent: fileData_reply.intent,
              icon: fileData_reply.icon,
              url: "",
              iframeUrl: "about:blank",
              extension: ""
            };

            file.url = await this.storage.ref( file.ref ).getDownloadURL().toPromise();
            const regex = file.url.match( /\.([0-9a-z]+)\?alt/i );
            if ( regex ) {
              file.extension = regex[1];
            }

            fileArray.push( file );
          }
        }

        this.managerStructure.files = fileArray;
        this.delayedIframeLoad();
        this.isOrderUploaded();
      } );
    } );
    this.isOrderUploaded();
    return true;
  }

  delayedIframeLoad() {
    console.log( 'delayedIframeLoad' );

    for ( let i = 0; i < this.managerStructure.files.length; i++ ) {
      setTimeout( () => {
        this.managerStructure.files[i].iframeUrl = this.makeIframeUrl( i );
      }, 500 * i );
    }
  }

  makeIframeUrl( index: number ): string {
    let file = this.managerStructure.files[index];
    let url = file.url;

    console.log( 'file url: ', url );

    // change iframe src after expiry time
    const extention = file.url.match( /\.([0-9a-z]+)\?alt/i );

    if ( extention ) {
      const encodedUrl = encodeURIComponent( file.url );

      switch ( extention[1] ) {
        case 'doc':
        case 'docx':
        case 'xls':
        case 'xlsx':
        case 'ppt':
        case 'pptx':
        case 'msg':
          return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;

        case 'pdf':
        case 'txt':
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
          return url;
      }
    }

    return "about:blank";
  }

  /**
* @todo -Open folders when double clicked
*/
  folderDoubleClicked( ref: String, type: String ) {
    console.log( 'Double clicked' );
    this.managerStructure.folders = [];
    const structure_update = this.checkStructure( ref, type );

    this.store.collection( `${structure_update}` ).get().subscribe( structures => {
      structures.forEach( structure => {
        if ( structure ) {
          let file = structure.data() as File;
          let folder = structure.data() as Folder;
          if ( file.type === 'file' )
            this.managerStructure.files.push( file );
          if ( folder.folderName )
            this.managerStructure.folders.push( structure.data() as Folder );
        }
      } );

      this.setManagerStructure();
      this.delayedIframeLoad();
      this.isOrderUploaded();
      this.loadComments();
    } );
  }

  /**
   * Checks structure that will be updated after doubleClick
   * @param ref -folders ref that was clicked
   * @param type -folders type that was clicked
   * @returns - new structure after doubleClick
   */
  checkStructure( ref: String, type: String ): String {
    switch ( type ) {
      case this.ORDERS:
        this.currentStructure = this.ORDERS;
        this.setUrlStructure();
        this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
        return this.ORDERS;
      case 'user':
        this.currentStructure += `/${ref}/years`;
        this.setUrlStructure();
        console.log( 'current structure is: ', this.currentStructure );
        this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
        return this.currentStructure;
      case 'year':
        this.currentStructure += `/${ref}/months`;
        this.setUrlStructure();
        console.log( 'current structure is: ', this.currentStructure );
        this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
        return this.currentStructure;
      case 'month':
        this.currentStructure += `/${ref}/orders`;
        this.setUrlStructure();
        console.log( 'current structure is: ', this.currentStructure );
        this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
        return this.currentStructure;
      case 'order':
        this.currentStructure += `/${ref}/files`;
        this.setUrlStructure();
        console.log( 'current structure is: ', this.currentStructure );
        this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
        return this.currentStructure;
      default: return this.ORDERS;
    }
  }

  structureHome(): void {
    this.currentJoinGroup = undefined;
    this.currentStructure = this.ORDERS + "//";
    this.structureBack();
  }

  structureSet( address: string ): void {
    this.currentJoinGroup = undefined;
    this.currentStructure = address;
    this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: this.currentStructure } );
    this.managerStructure.folders = [];
    this.managerStructure.files = [];
    this.messageShowed = false;

    this.store.collection( `${this.currentStructure}` ).get().subscribe( structures => {
      structures.forEach( structure => {
        if ( structure ) {
          let file = structure.data() as File;
          let folder = structure.data() as Folder;

          if ( file.type === 'file' ) {
            this.storage.ref( file.ref ).getDownloadURL().subscribe( url => {
              file.url = url;
              this.managerStructure.files.push( file );
            } );
          }
          if ( folder.folderName )
            this.managerStructure.folders.push( structure.data() as Folder );
        }
      } );


      this.loadComments();
      this.setManagerStructure();
      this.isOrderUploaded();
      this.setUrlStructure();
      this.delayedIframeLoad();
    } );
  }

  /**
   * Sets back structure after back Click
   */
  structureBack() {
    this.currentJoinGroup = undefined;
    if ( this.currentStructure !== this.ORDERS ) {
      this.messageShowed = false;

      const set_structure = this.currentStructure.slice( 0, this.currentStructure.lastIndexOf( "/" ) );
      this.currentStructure = set_structure.slice( 0, set_structure.lastIndexOf( "/" ) );
      this.setUrlStructure();
      this.managerStructure.folders = [];
      this.managerStructure.files = [];
      this.store.doc( `${this.USERS}/${this.user.uid}` ).update( { managerLastRef: `${this.currentStructure}` } );
      let promise: any[] = [];
      this.store.collection( `${this.currentStructure}`, sort =>
        sort.orderBy( 'folderName', 'asc' ) ).get().subscribe( structures => {
          structures.forEach( structure => {
            if ( structure ) {
              promise.push( '0' );
              let check_files = structure.data() as Folder;
              let check_folders = structure.data() as File;

              if ( check_files.type === 'file' )
                this.managerStructure.files.push( structure.data() as File );
              if ( !( check_folders.type === 'file' ) )
                this.managerStructure.folders.push( structure.data() as Folder );
            }
          } );
          Promise.all( promise ).then( () => {
            this.delayedIframeLoad();
            this.isOrderUploaded();
            this.loadComments();
          } );
        } );
    }
  }

  /**
   * Checks if current structure is on folder files
   */
  getCurrentStructureFolderType() {
    if ( this.currentStructure.match( '^.*/files$' ) ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Upload order files to storage and set ref in firebase
   * @param event -upload input event
   * @param type -clientOrder or carrierOrder type in string
   */
  addFile( event: any, type: string ) {
    const is_file_exisit = this.storage.storage.ref( `${this.currentStructure}/${event.target.files[0].name}` ).getMetadata().catch( error => {
      console.log( 'its not an error', error.code );
      if ( error.code === 'storage/object-not-found' ) {
        const file = event.target.files[0];
        const filePath = `${this.currentStructure}/${event.target.files[0].name}`;
        const ref = this.storage.ref( filePath );
        const task = ref.put( file, { customMetadata: { type: type } } );
        console.log( 'download url is: ' + ref.getDownloadURL() );
        this.isFileUploading = true;
        this.fileUploadProgressValue = task.percentageChanges();
        task.snapshotChanges().pipe(
          finalize( () => {
            const firebase_name = type === 'other' ? event.target.files[0].name : type;
            this.store.doc( `${this.currentStructure}/${firebase_name}` ).set( { fileName: event.target.files[0].name, ref: filePath, type: 'file', intent: type } ).then( () => {
              this.isFileUploading = false;
              this.fileUploadProgressValue = undefined;
              this.setManagerStructure();
            } );
          } )
        )
          .subscribe();
      }
    } );
    is_file_exisit.then( meta => {
      if ( meta ) {
        this.dialogService.openSimpleDialog( 'Ten plik już istnieje', 'ok', 'warning' );
      }
    } );
  }


  /**
   * Delete order files from storage and firebase
   * @param file -Clicked file from context menu that will be deleted
   */
  deleteFile( file: File ) {
    this.closeContextMenu();
    this.isFoldersLoading = true;
    switch ( file.intent ) {
      case 'carrierOrder':
        this.store.doc( `${this.currentStructure}/${file.intent}` ).delete().then( () => {
          const storageRef = this.storage.storage.ref();
          storageRef.child( `${file.ref}` ).delete().then( () => {
            this.setManagerStructure();
            this.isFoldersLoading = false;
          } );
        } );
        break;
      case 'clientOrder':
        this.store.doc( `${this.currentStructure}/${file.intent}` ).delete().then( () => {
          const storageRef = this.storage.storage.ref();
          storageRef.child( `${file.ref}` ).delete().then( () => {
            this.setManagerStructure();
            this.isFoldersLoading = false;
          } );
        } );
        break;
      case 'other':
        this.store.doc( `${this.currentStructure}/${file.fileName}` ).delete().then( () => {
          const storageRef = this.storage.storage.ref();
          storageRef.child( `${file.ref}` ).delete().then( () => {
            this.setManagerStructure();
            this.isFoldersLoading = false;
          } );
        } );
        break;

      default:
        break;
    }
  }

  /**
   * Opens file from firebase storage in new window
   * @param file -File that will be opened in new window
   */
  async openFile( file: File ) {
    const storageRef = this.storage.storage.ref();
    const url = ( await storageRef.child( `${file.ref}` ).getDownloadURL() ).toString();
    window.open( url, "_blank" );
  }

  /**
   * Close the contextmenu right clicked from file
   */
  closeContextMenu() {
    this.sub && this.sub.unsubscribe();
    if ( this.overlayRef ) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Gets icon for files in manager
   * @param intent -String that says if its client order, carrier order or other intent
   * @returns -String with icon name for mat icon
   */
  getFileIcon( intent: String ): String {
    switch ( intent ) {
      case 'clientOrder':
        return 'badge';
        break;
      case 'carrierOrder':
        return 'local_shipping';
        break;
      case 'other':
        return 'help_center';
        break;
      default:
        return 'help_center';
        break;
    }
  }

  /**
   * Checks if button in menu to add file is disabled
   * @param intent -String that says if its client order, carrier order or other intent
   * @returns -Boolean to determinate if its disabled or not
   */
  isItemDisabled( intent: String ): boolean {
    let isDisabled = false;
    if ( this.managerStructure.files ) {
      this.managerStructure.files.forEach( file => {
        if ( file.intent === intent ) {
          isDisabled = true;
        }
      } );
    }
    return isDisabled;
  }

  /**
   * Sets Adres url of the current structure in filemanger frontend
   */
  async setUrlStructure() {
    const first_change = this.currentStructure.slice( this.ORDERS.length + 1 );
    if ( first_change ) {
      console.log( 'first change is: ', first_change );
      const second_change = first_change.slice( 0, first_change.indexOf( '/' ) );
      console.log( 'second change is: ', second_change );
      const user_folder: Folder = ( await this.store.doc( `${this.ORDERS}/${second_change}` ).get().toPromise() ).data() as Folder;
      this.adresUrl = user_folder.folderName;
      const third_change_check = first_change.slice( first_change.indexOf( '/' ) ).slice().substring( 1 );
      if ( third_change_check ) {
        console.log( 'third change check is: ', third_change_check );
        const third_change = third_change_check.slice( third_change_check.indexOf( '/' ) ).substring( 1 );
        if ( third_change ) {
          console.log( 'third change is: ', third_change );
          this.adresUrl += '/' + third_change.slice( 0, third_change.indexOf( '/' ) );
          const fourth_change_check = third_change.slice( third_change.indexOf( '/months' ) ).substring( 7 );
          console.log( 'foruth change check is: ', fourth_change_check );
          const fourth_change = fourth_change_check.substring( 1 );
          if ( fourth_change ) {
            console.log( 'fourth change is: ', fourth_change );
            const month = this.getMonthString( fourth_change.slice( 0, fourth_change.indexOf( '/' ) ) );
            this.adresUrl += '/' + month;
            const fifth_change_check = fourth_change.slice( fourth_change.lastIndexOf( '/' ) ).substring( 1 );
            if ( fifth_change_check === 'files' ) {
              console.log( 'fifth change check is: ', fifth_change_check );
              const fifth_change = fourth_change.slice( fourth_change.indexOf( 'orders/' ), fourth_change.lastIndexOf( '/' ) ).substring( 7 );
              console.log( 'fifth change is: ', fifth_change );
              this.adresUrl += '/' + fifth_change;
            }
          }
        }
      }
    } else {
      this.adresUrl = '';
    }
  }

  /**
   * Gets Month in string to put it in the adres url of the file manager front end
   * @param number -Number inserted from currentstructure var
   * @returns -Month in string to put into adres url of the file manager front end
   */
  getMonthString( number: string ): string {
    switch ( number ) {
      case '1':
        return 'Styczeń';
        break;
      case '2':
        return 'Luty';
        break;
      case '3':
        return 'Marzec';
        break;
      case '4':
        return 'Kwiecień';
        break;
      case '5':
        return 'Maj';
        break;
      case '6':
        return 'Czerwiec';
        break;
      case '7':
        return 'Lipiec';
        break;
      case '8':
        return 'Sierpień';
        break;
      case '9':
        return 'Wrzesień';
        break;
      case '10':
        return 'Październik';
        break;
      case '11':
        return 'Listopad';
        break;
      case '12':
        return 'Grudzień';
        break;

      default: return '';
        break;
    }
  }

  /**
   * checks if orderclient and ordercarrier are uploaded in order folder
   */
  isOrderUploaded() {
    if ( this.currentStructure.slice( this.currentStructure.lastIndexOf( '/' ) ).substring( 1 ) === 'orders' ) {
      console.log( 'checking if orders are uploaded inside of all folders' );
      console.log( 'folders count is: ', this.managerStructure.folders.length );
      this.managerStructure.folders.forEach( async folder => {

        const uploadCheckJobs = [
          this.store.doc( `${this.currentStructure}/${folder.ref}/files/clientOrder` ).ref.get(),
          this.store.doc( `${this.currentStructure}/${folder.ref}/files/carrierOrder` ).ref.get()
        ];

        Promise.all( uploadCheckJobs ).then( ( results ) => {
          folder.correction = ( results[0].exists && results[1].exists );
        } );

      } );
    }
    if ( this.currentStructure.slice( this.currentStructure.lastIndexOf( '/' ) ).substring( 1 ) === 'files' ) {
      let clientUploaded = 'Brak zlecenia od klienta!';
      let carrierUploaded = 'Brak zlecenia dla przewoźnika!';
      console.log( 'checking if orders are uploaded arleady in folder' );
      this.managerStructure.files.forEach( file => {
        if ( file.intent === 'carrierOrder' )
          carrierUploaded = '';
        if ( file.intent === 'clientOrder' )
          clientUploaded = '';
      } );
      const adres_to_update = this.currentStructure.slice( 0, this.currentStructure.lastIndexOf( '/' ) );
      this.store.doc<Folder>( adres_to_update ).get().subscribe( folder => {
        let folderData = folder.data() as Folder;
        if ( !folderData.canceled ) {
          this.isClientOrderUploaded = clientUploaded;
          this.isCarrerOrderUploaded = carrierUploaded;
        } else {
          this.isClientOrderUploaded = 'Zlecenie zostało anulowane!';
        }
      } );
    }
    else {
      this.isClientOrderUploaded = '';
      this.isCarrerOrderUploaded = '';
    }
  }

  /**
   *
   * @param isAdmin boolean is admin true
   * @returns admin or spedytor depends if admin is true or false
   */
  checkRole( isAdmin: boolean ): string {
    if ( isAdmin )
      return 'Admin';
    else
      return 'Spedytor';
  }



  /**
   * Set user as Admin
   * @param uid -uid of user that will be set as admin
   */
  setAdmin( uid: string ) {
    this.store.doc( `${this.USERS}/${uid}` ).update( { isAdmin: true, doNotLogout: true } );
  }

  /**
   * Disable admin of user
   * @param uid -uid of user that will be disabled from admin
   */
  disableAdmin( uid: string ) {
    this.store.doc( `${this.USERS}/${uid}` ).update( { isAdmin: false, doNotLogout: false } );
  }

  async hideFolders( uid: string ) {
    const user: User = await ( await this.store.doc( `${this.USERS}/${uid}` ).get().toPromise() ).data() as User;
    this.store.doc( `${this.USERS}/${user.uid}` ).update( { foldersHidden: true } ).then( () => {
      this.store.doc( `${this.ORDERS}/${user.idPrac}` ).update( { hidden: true } ).catch(
        error => this.dialogService.openSimpleDialog( 'Użytkownik nie posiada folderów', 'OK', 'neutral' )
      );
    } );
  }

  async showFolders( uid: string ) {
    const user: User = await ( await this.store.doc( `${this.USERS}/${uid}` ).get().toPromise() ).data() as User;
    this.store.doc( `${this.USERS}/${user.uid}` ).update( { foldersHidden: false } ).then( () => {
      this.store.doc( `${this.ORDERS}/${user.idPrac}` ).update( { hidden: false } ).catch(
        error => this.dialogService.openSimpleDialog( 'Użytkownik nie posiada folderów', 'OK', 'neutral' )
      );
    } );
  }

  /**
   * Checks if users folders are hidden
   * @param hidden boolean of the foldersHidden from user interface
   * @returns -String of the hidden result
   */
  checkFoldersActive( hidden: boolean ): string {
    if ( hidden )
      return 'Ukryte';
    else
      return 'Aktywne';
  }
  /**
   * Checks if useridPrac is same as ref given to function
   * @param ref -folder.ref var
   * @returns -true or false
   */
  getUserIdPrac( ref: string ): boolean {
    if ( ref == this.user.idPrac?.toString() ) {
      if ( this.user.foldersHidden )
        return false;
      else return true;
    } else {
      return false;
    }

  }

  /**
   *  Log out user from SpedTrans if is logged in
   * @param user -User that will be logedOut from Spedtrans
   */
  async spedTransLogOutUser( user: User ) {
    this.IsUserTableLoading = true;
    let api_request = {} as LogoutSpedTransRequest;
    api_request.initials = user.initials;
    api_request.sid = localStorage.getItem( 'sid' )!;
    console.log( 'Current sid is: ', api_request.sid );
    let api_response = {} as LogoutSpedTransReply;
    api_response = ( await this.http.post( `${this.apiAdres}/logoutSpedTrans`, api_request ).toPromise().catch(
      error => {
        this.dialogService.openSimpleDialog( 'Nie nawiązano połączenia', 'OK', 'warning' );
        this.IsUserTableLoading = false;
      } ) as LogoutSpedTransReply );
    if ( api_response.result ) {
      console.log( 'response is: ', api_response.result );
      this.store.doc<User>( `${this.USERS}/${user.uid}` ).update( { inLogUsers: false } ).then( () => {
        this.dialogService.openSimpleDialog( `${user.firstName} ${user.lastName} został wylogowany ze SpedTransa`, 'OK', 'positive' );
        this.IsUserTableLoading = false;
      } );
    } else this.IsUserTableLoading = false;
  }

  checkIfAdmin(): boolean {
    if ( this.user.isAdmin )
      return true;
    else
      return false;
  }

  setAutoLogOffTime() {
    this.store.doc<Sql>( 'rns-config/sql' ).update( { spedTransLogTime: this.spedTransLogTimeSetter } ).then( () => {
      this.spedTransLogTimeSetter = null;
    } );
  }

  addCommentToFolder() {
    this.isFoldersLoading = true;
    console.log( 'current comments are: ', this.currentComments );
    console.log( 'current comments to add are: ', this.currentCommentsToAdd );
    if ( this.currentCommentsToAdd ) {
      this.currentCommentsToAdd.comments.push( { author: this.user.firstName + ' ' + this.user.lastName, dateCreated: new Date(), comment: this.commentToAdd } );
    } else {
      this.currentCommentsToAdd = { comments: [{ author: this.user.firstName + ' ' + this.user.lastName, dateCreated: new Date(), comment: this.commentToAdd }] };
    }
    this.store.doc( `${this.currentStructure}/comments` ).set( this.currentCommentsToAdd ).then( () => {
      this.isFoldersLoading = false;
      this.dialogService.openSimpleDialog( 'Dodano komentarz', 'OK', 'positive' );
      this.commentToAdd = '';
    } );
    this.loadComments();
  }

  getCommentsCount(): number {
    if ( this.currentComments ) {
      return this.currentComments.length;
    }
    else {
      return 0;
    }
  }

  getJoinedOrdersCount(): number {
    if ( this.currentJoinGroup && this.currentJoinGroup.orders ) {
      return this.currentJoinGroup.orders.length;
    } else
      return 0;
  }

  loadComments() {
    this.store.doc<Comments>( `${this.currentStructure}/comments` ).get().subscribe( comments => {
      this.currentCommentsToAdd = comments.data() as Comments;
      this.currentComments = [];
      if ( this.currentCommentsToAdd ) {
        for ( let index = 0; index < this.currentCommentsToAdd.comments.length; index++ ) {
          const comment_add = {
            author: this.currentCommentsToAdd.comments[index].author,
            dateCreated: this.currentCommentsToAdd.comments[index].dateCreated.toDate(),
            comment: this.currentCommentsToAdd.comments[index].comment
          };
          this.currentComments.push( comment_add );
        }
      }

      console.log( 'current comments are: ', this.currentComments );
    } );

    // get joinGroup from order
    if ( this.currentStructure.slice( -5 ) == 'files' ) {

      const orderPath = this.currentStructure.split( '/files' )[0];
      const joinsPath = orderPath.split( '/years' )[0] + '/joins';
      console.log( 'joinsPath is: ', joinsPath );

      this.store.doc( orderPath ).get().toPromise().then( ( result ) => {
        if ( result.exists ) {
          const folder = result.data() as Folder;
          this.store.collection( joinsPath ).doc( folder.joinGroup ).get().toPromise().then( ( joinGroup ) => {
            if ( joinGroup.exists ) {
              this.currentJoinGroup = joinGroup.data() as JoinGroup;
            }
          } );
        }
      } );
    }
  }

  cancelOrder() {
    const adres_to_update = this.currentStructure.slice( 0, this.currentStructure.lastIndexOf( '/' ) );
    this.store.doc( adres_to_update ).update( { canceled: true } ).then( () => {
      this.setManagerStructure();
      this.commentToAdd = 'Zlecenie zostało anulowane!';
      this.addCommentToFolder();
      this.dialogService.openSimpleDialog( 'Zlecenie zostało anulowane!', 'OK', 'positive' );
    } );
  }

  getLoggedTime( uid: string, loggedIn: boolean ): string | undefined | null {
    const min: TimerCounter | undefined = this.userTimerCounters.find( i => i.uid == uid );
    if ( min && loggedIn ) {
      if ( min.timer )
        return "| " + min.timer + 'm';
      else return "";
    }
    else {
      const timer_index = this.userTimerCounters.findIndex( i => i.uid == uid );
      if ( this.userTimerCounters[timer_index] ) {
        console.log( 'timer_index is: ', timer_index );
        this.userTimerCounters.splice( timer_index, 1 );
        console.log( 'The user of uid: ' + uid + ' timer has been deleted: ' );
      }
      return '';
    }
  }

  setLoggedTime( user: User ) {
    this.userTimerCounters.push( { uid: user.uid, timeLoggedIn: user.logUsersDate, timer: '' } );
    const timer_index = this.userTimerCounters.length - 1;
    if ( this.userTimerCounters[timer_index] ) {
      const date_now_sec = new Date().getTime();
      const logged_in_sec = user.logUsersDate.toDate().getTime();
      const timer_min = Math.round( ( date_now_sec - logged_in_sec ) / 60000 );
      this.userTimerCounters[timer_index].timer = timer_min.toString();
    }
    var interval = setInterval( () => {
      if ( this.userTimerCounters[timer_index] ) {
        const date_now_sec = new Date().getTime();
        const logged_in_sec = user.logUsersDate.toDate().getTime();
        const timer_min = Math.round( ( date_now_sec - logged_in_sec ) / 60000 );
        this.userTimerCounters[timer_index].timer = timer_min.toString();
      } else {
        clearInterval( interval );
      }
    }, 10000 );
  }

}

