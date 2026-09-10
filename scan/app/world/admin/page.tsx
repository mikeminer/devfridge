import type {Metadata} from 'next';
import TopShelfAdmin from '@/components/topshelf/TopShelfAdmin';

export const metadata:Metadata={
 title:{absolute:'TopShelf Admin — DevFridge World'},
 description:'Owner console for DevFridge World verified scores on Robinhood Chain.',
 alternates:{canonical:'https://world.devfridge.cool/admin'},
 robots:{index:false,follow:false},
};

export default function AdminPage(){return <TopShelfAdmin/>;}
