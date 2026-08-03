package com.researcher.tool.repository;

import com.researcher.tool.model.FollowRequest;
import com.researcher.tool.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {
    Optional<FollowRequest> findBySenderAndReceiver(User sender, User receiver);

    boolean existsBySenderAndReceiverAndStatus(User sender, User receiver, FollowRequest.RequestStatus status);

    List<FollowRequest> findByReceiverAndStatus(User receiver, FollowRequest.RequestStatus status);

    List<FollowRequest> findBySenderAndStatus(User sender, FollowRequest.RequestStatus status);

    void deleteBySenderAndReceiver(User sender, User receiver);
}
