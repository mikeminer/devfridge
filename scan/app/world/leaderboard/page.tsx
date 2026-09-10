import type {Metadata} from 'next';
import Leaderboard from '@/components/topshelf/Leaderboard';
export const metadata:Metadata={title:{absolute:'TopShelf — DevFridge World Leaderboard'},description:'Seasonal DevFridge World scores, Robinhood token pools and owner-approved claims.',alternates:{canonical:'https://world.devfridge.cool/leaderboard'},openGraph:{title:'TopShelf — DevFridge World',description:'The World leaderboard. Your best score, your season.',url:'https://world.devfridge.cool/leaderboard',images:['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png']},twitter:{card:'summary_large_image',images:['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png']}};
export default function LeaderboardPage(){return <Leaderboard/>;}
