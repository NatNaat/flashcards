import {
  Cards,
  ChartBar,
  Trash,
  X,
  MagnifyingGlass,
  UploadSimple,
  Pause,
  Play,
  Plus,
  FilePlus,
  StackPlus,
  Check,
  UserCircle,
  Gear,
  TrendUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CaretRight,
  HouseSimple,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react';

type IconProps = { size?: number };

const weight: PhosphorIconProps['weight'] = 'bold';

export function DecksIcon({ size = 20 }: IconProps) {
  return <Cards size={size} weight={weight} />;
}

export function StatsIcon({ size = 20 }: IconProps) {
  return <ChartBar size={size} weight={weight} />;
}

export function TrashIcon({ size = 18 }: IconProps) {
  return <Trash size={size} weight={weight} />;
}

export function CloseIcon({ size = 18 }: IconProps) {
  return <X size={size} weight={weight} />;
}

export function SearchIcon({ size = 18 }: IconProps) {
  return <MagnifyingGlass size={size} weight={weight} />;
}

export function UploadIcon({ size = 18 }: IconProps) {
  return <UploadSimple size={size} weight={weight} />;
}

export function PauseIcon({ size = 16 }: IconProps) {
  return <Pause size={size} weight={weight} />;
}

export function PlayIcon({ size = 16 }: IconProps) {
  return <Play size={size} weight={weight} />;
}

export function PlayFilledIcon({ size = 20 }: IconProps) {
  return <Play size={size} weight="fill" />;
}

export function PlusIcon({ size = 18 }: IconProps) {
  return <Plus size={size} weight={weight} />;
}

export function AddCardIcon({ size = 20 }: IconProps) {
  return <FilePlus size={size} weight={weight} />;
}

export function AddDeckIcon({ size = 20 }: IconProps) {
  return <StackPlus size={size} weight={weight} />;
}

export function CheckIcon({ size = 16 }: IconProps) {
  return <Check size={size} weight={weight} />;
}

export function ProfileIcon({ size = 20 }: IconProps) {
  return <UserCircle size={size} weight={weight} />;
}

export function GearIcon({ size = 20 }: IconProps) {
  return <Gear size={size} weight={weight} />;
}

export function ProgressionIcon({ size = 20 }: IconProps) {
  return <TrendUp size={size} weight={weight} />;
}

export function ArrowLeftIcon({ size = 18 }: IconProps) {
  return <ArrowLeft size={size} weight={weight} />;
}

export function ArrowRightIcon({ size = 18 }: IconProps) {
  return <ArrowRight size={size} weight={weight} />;
}

export function ArrowUpIcon({ size = 18 }: IconProps) {
  return <ArrowUp size={size} weight={weight} />;
}

export function ArrowDownIcon({ size = 18 }: IconProps) {
  return <ArrowDown size={size} weight={weight} />;
}

export function ChevronIcon({ size = 16 }: IconProps) {
  return <CaretRight size={size} weight={weight} />;
}

export function HomeIcon({ size = 20 }: IconProps) {
  return <HouseSimple size={size} weight={weight} />;
}
