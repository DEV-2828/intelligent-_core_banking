"use client";
import {useRef} from "react";
export function useRequestKey(){const previous=useRef<{body:string;key:string}|null>(null);return {keyFor(body:unknown){const serialized=JSON.stringify(body);if(previous.current?.body!==serialized)previous.current={body:serialized,key:crypto.randomUUID()};return previous.current.key;},complete(){previous.current=null;}};}
