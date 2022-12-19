import { createWorkspace } from '@pathfinder/data-services';
import Modal from '@/ui/modal';
import Input from '@/ui/input';
import { Button } from '@/ui/button';
import {
  StyledModalHeader,
  StyledTextContent,
  StyledModalWrapper,
  StyledInputContent,
  StyledButtonContent,
} from './style';
import { useState } from 'react';
import { ModalCloseButton } from '@/ui/modal';

interface WorkspaceCreateProps {
  open: boolean;
  onClose: () => void;
}

export const WorkspaceCreate = ({ open, onClose }: WorkspaceCreateProps) => {
  const [workspaceName, setWorkspaceId] = useState<string>('');
  const handlerInputChange = (workspaceName: string) => {
    setWorkspaceId(workspaceName);
  };
  console.log('workspaceName', workspaceName);
  return (
    <Modal open={open} onClose={onClose}>
      <StyledModalWrapper>
        <ModalCloseButton />
        <StyledModalHeader>Create new Workspace</StyledModalHeader>
        <StyledTextContent>
          Workspaces are shared environments where teams can collaborate. After
          creating a Workspace, you can invite others to join.
        </StyledTextContent>
        <StyledInputContent>
          <Input
            onChange={handlerInputChange}
            placeholder="Set a Workspace name"
            value={workspaceName}
          ></Input>
        </StyledInputContent>
        <StyledButtonContent>
          <Button
            disabled={!workspaceName.length}
            style={{ width: '260px' }}
            onClick={() => {
              createWorkspace({ name: workspaceName, avatar: '' });
            }}
          >
            Create
          </Button>
        </StyledButtonContent>
      </StyledModalWrapper>
    </Modal>
  );
};

export default WorkspaceCreate;
