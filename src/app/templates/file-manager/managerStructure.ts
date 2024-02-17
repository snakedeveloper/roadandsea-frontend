import { File } from "./file";
import { Folder } from "./folder";

export interface ManagerStructure {
    folders: Folder[]
    files: File[]
}