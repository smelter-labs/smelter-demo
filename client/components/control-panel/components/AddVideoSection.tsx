import type { Input } from '@/app/actions/actions';
import Accordion, { type AccordionHandle } from '@/components/ui/accordion';
import TwitchAddInputForm from '../add-input-form/twitch-add-input-form';
import { Mp4AddInputForm } from '../add-input-form/mp4-add-input-form';
import { KickAddInputForm } from '../add-input-form/kick-add-input-form';
import { ImageAddInputForm } from '../add-input-form/image-add-input-form';
import { WHIPAddInputForm } from '../add-input-form/whip-add-input-form';
import { ScreenshareAddInputForm } from '../add-input-form/screenshare-add-input-form';

type AddTab = 'stream' | 'mp4' | 'image' | 'inputs';
type StreamTab = 'twitch' | 'kick';
type InputsTab = 'camera' | 'screenshare';

type AddVideoSectionProps = {
  inputs: Input[];
  roomId: string;
  refreshState: () => Promise<void>;
  addInputActiveTab: AddTab;
  setAddInputActiveTab: (tab: AddTab) => void;
  streamActiveTab: StreamTab;
  setStreamActiveTab: (tab: StreamTab) => void;
  inputsActiveTab: InputsTab;
  setInputsActiveTab: (tab: InputsTab) => void;
  userName: string;
  setUserName: (name: string) => void;
  cameraPcRef: React.MutableRefObject<RTCPeerConnection | null>;
  cameraStreamRef: React.MutableRefObject<MediaStream | null>;
  screensharePcRef: React.MutableRefObject<RTCPeerConnection | null>;
  screenshareStreamRef: React.MutableRefObject<MediaStream | null>;
  setActiveCameraInputId: (id: string | null) => void;
  setIsCameraActive: (active: boolean) => void;
  setActiveScreenshareInputId: (id: string | null) => void;
  setIsScreenshareActive: (active: boolean) => void;
  addVideoAccordionRef: React.MutableRefObject<AccordionHandle | null>;
};

export function AddVideoSection({
  inputs,
  roomId,
  refreshState,
  addInputActiveTab,
  setAddInputActiveTab,
  streamActiveTab,
  setStreamActiveTab,
  inputsActiveTab,
  setInputsActiveTab,
  userName,
  setUserName,
  cameraPcRef,
  cameraStreamRef,
  screensharePcRef,
  screenshareStreamRef,
  setActiveCameraInputId,
  setIsCameraActive,
  setActiveScreenshareInputId,
  setIsScreenshareActive,
  addVideoAccordionRef,
}: AddVideoSectionProps) {
  const tabs: { id: AddTab; label: string }[] = [
    { id: 'stream', label: 'Stream' },
    { id: 'mp4', label: 'MP4' },
    { id: 'image', label: 'Image' },
    { id: 'inputs', label: 'Inputs' },
  ];

  return (
    <Accordion
      ref={addVideoAccordionRef}
      title='Add Video'
      defaultOpen
      data-accordion='true'>
      <div className=''>
        <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 justify-center'>
          {tabs.map((t) => {
            const isActive = addInputActiveTab === t.id;
            return (
              <button
                key={t.id}
                className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-base font-bold transition-colors ${
                  isActive
                    ? 'border-b-[3px] border-red-40 text-white-100'
                    : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                }`}
                onClick={() => setAddInputActiveTab(t.id)}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className='pt-3'>
          {addInputActiveTab === 'stream' && (
            <div>
              <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 mb-3 justify-center'>
                <button
                  className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                    streamActiveTab === 'twitch'
                      ? 'border-b-[3px] border-red-40 text-white-100'
                      : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                  }`}
                  onClick={() => setStreamActiveTab('twitch')}>
                  Twitch
                </button>
                <button
                  className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                    streamActiveTab === 'kick'
                      ? 'border-b-[3px] border-red-40 text-white-100'
                      : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                  }`}
                  onClick={() => setStreamActiveTab('kick')}>
                  Kick
                </button>
              </div>
              {streamActiveTab === 'twitch' && (
                <div data-tour='twitch-add-input-form-container'>
                  <TwitchAddInputForm
                    inputs={inputs}
                    roomId={roomId}
                    refreshState={refreshState}
                  />
                </div>
              )}
              {streamActiveTab === 'kick' && (
                <div data-tour='kick-add-input-form-container'>
                  <KickAddInputForm
                    inputs={inputs}
                    roomId={roomId}
                    refreshState={refreshState}
                  />
                </div>
              )}
            </div>
          )}
          {addInputActiveTab === 'mp4' && (
            <div data-tour='mp4-add-input-form-container'>
              <Mp4AddInputForm
                inputs={inputs}
                roomId={roomId}
                refreshState={refreshState}
              />
            </div>
          )}
          {addInputActiveTab === 'image' && (
            <div data-tour='image-add-input-form-container'>
              <ImageAddInputForm
                inputs={inputs}
                roomId={roomId}
                refreshState={refreshState}
              />
            </div>
          )}
          {addInputActiveTab === 'inputs' && (
            <div>
              <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 mb-3 justify-center'>
                <button
                  className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                    inputsActiveTab === 'camera'
                      ? 'border-b-[3px] border-red-40 text-white-100'
                      : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                  }`}
                  onClick={() => setInputsActiveTab('camera')}>
                  Camera
                </button>
                <button
                  className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                    inputsActiveTab === 'screenshare'
                      ? 'border-b-[3px] border-red-40 text-white-100'
                      : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                  }`}
                  onClick={() => setInputsActiveTab('screenshare')}>
                  Screenshare
                </button>
              </div>
              {inputsActiveTab === 'camera' && (
                <WHIPAddInputForm
                  inputs={inputs}
                  roomId={roomId}
                  refreshState={refreshState}
                  userName={userName}
                  setUserName={setUserName}
                  pcRef={cameraPcRef}
                  streamRef={cameraStreamRef}
                  setActiveWhipInputId={setActiveCameraInputId}
                  setIsWhipActive={setIsCameraActive}
                />
              )}
              {inputsActiveTab === 'screenshare' && (
                <ScreenshareAddInputForm
                  inputs={inputs}
                  roomId={roomId}
                  refreshState={refreshState}
                  userName={userName}
                  setUserName={setUserName}
                  pcRef={screensharePcRef}
                  streamRef={screenshareStreamRef}
                  setActiveWhipInputId={setActiveScreenshareInputId}
                  setIsWhipActive={setIsScreenshareActive}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Accordion>
  );
}
